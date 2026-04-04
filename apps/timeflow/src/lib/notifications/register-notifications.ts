import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { getApiV1Timers, getGetApiV1TimersQueryKey } from "@acme/api-client";
import { now, parseDateTime } from "@/src/lib/date";
import { queryClient } from "@/src/lib/query-client";
import { enqueuePauseTimerSessionOnServer } from "@/src/lib/timer-session/pause-timer-session";
import {
  ACTIVE_TIMER_CATEGORY_ID,
  ACTIVE_TIMER_NOTIFICATION_ID,
  ACTIVE_TIMER_PAUSE_ACTION_ID,
} from "@/src/lib/notifications/active-timer-notification-constants";
import {
  clearActiveTimerNotificationSnapshot,
  setSuppressActiveTimerNotificationSync,
} from "@/src/lib/notifications/active-timer-notification-state";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type TimersQueryData = Awaited<ReturnType<typeof getApiV1Timers>>;

function applyOptimisticPauseToTimersQueries(input: {
  timerId: string;
  startedAt: string;
  zone: string;
}): void {
  const durationSeconds = Math.max(
    0,
    Math.floor(
      now(input.zone).diff(parseDateTime(input.startedAt, input.zone), "seconds").seconds
    )
  );
  queryClient.setQueriesData<TimersQueryData>(
    { queryKey: getGetApiV1TimersQueryKey() },
    (old) => {
      if (old == null || old.status !== 200) return old;
      return {
        ...old,
        data: {
          ...old.data,
          data: old.data.data.map((t) =>
            t.id === input.timerId
              ? {
                  ...t,
                  timer_session_in_progress: null,
                  total_timer_session_time: t.total_timer_session_time + durationSeconds,
                }
              : t
          ),
        },
      };
    }
  );
}

let routingRegistered = false;
let pauseFromNotificationInFlight = false;

async function handleNotificationPauseResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  if (response.actionIdentifier !== ACTIVE_TIMER_PAUSE_ACTION_ID) return;

  const data = response.notification.request.content.data;
  if (!isRecord(data)) return;

  const timerId = data.timerId;
  const sessionId = data.sessionId;
  const startedAt = data.startedAt;
  const zone = data.zone;
  if (
    typeof timerId !== "string" ||
    typeof sessionId !== "string" ||
    typeof startedAt !== "string" ||
    typeof zone !== "string"
  ) {
    return;
  }

  if (pauseFromNotificationInFlight) return;
  pauseFromNotificationInFlight = true;
  setSuppressActiveTimerNotificationSync(true);
  try {
    applyOptimisticPauseToTimersQueries({ timerId, startedAt, zone });

    clearActiveTimerNotificationSnapshot();
    try {
      await Notifications.cancelScheduledNotificationAsync(ACTIVE_TIMER_NOTIFICATION_ID);
    } catch {
      // No scheduled notification with this id.
    }

    const endedAt = now(zone).toISO() ?? "";
    await enqueuePauseTimerSessionOnServer({
      timerId,
      sessionId,
      startedAt,
      endedAt,
    });

    const timersPrefix = getGetApiV1TimersQueryKey();
    await queryClient.invalidateQueries({ queryKey: timersPrefix });
    await queryClient.refetchQueries({ queryKey: timersPrefix });
    await Notifications.clearLastNotificationResponseAsync();
  } finally {
    setSuppressActiveTimerNotificationSync(false);
    pauseFromNotificationInFlight = false;
  }
}

function registerNative(): void {
  if (routingRegistered) return;
  routingRegistered = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  void Notifications.setNotificationCategoryAsync(ACTIVE_TIMER_CATEGORY_ID, [
    {
      identifier: ACTIVE_TIMER_PAUSE_ACTION_ID,
      buttonTitle: "Pause",
      options: { opensAppToForeground: true },
    },
  ]);

  Notifications.addNotificationResponseReceivedListener((event) => {
    void handleNotificationPauseResponse(event);
  });
}

/**
 * Call once at startup (import side effect from root layout). No-op on web.
 */
export function registerActiveTimerNotifications(): void {
  if (Platform.OS === "web") return;
  registerNative();
}

/**
 * Handles Pause that launched or resumed the app from a killed state.
 */
export async function consumeColdStartNotificationPauseResponse(): Promise<void> {
  if (Platform.OS === "web") return;
  const last = await Notifications.getLastNotificationResponseAsync();
  if (!last || last.actionIdentifier !== ACTIVE_TIMER_PAUSE_ACTION_ID) return;
  try {
    await handleNotificationPauseResponse(last);
  } finally {
    await Notifications.clearLastNotificationResponseAsync();
  }
}

registerActiveTimerNotifications();
