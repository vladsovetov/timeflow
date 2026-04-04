import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useQuery } from "@tanstack/react-query";
import { getApiV1Timers, getGetApiV1TimersQueryKey } from "@acme/api-client";
import type { Timer as TimerModel } from "@acme/api-client";
import { useUserTimezone } from "@/src/contexts/AppContext";
import { now, parseDateTime } from "@/src/lib/date";
import { getPendingInProgressSessions } from "@/src/lib/sync-queue-timer-sessions";
import {
  clearActiveTimerNotificationSnapshot,
  getSuppressActiveTimerNotificationSync,
  setActiveTimerNotificationSnapshot,
} from "@/src/lib/notifications/active-timer-notification-state";
import {
  ACTIVE_TIMER_CATEGORY_ID,
  ACTIVE_TIMER_CHANNEL_ID,
  ACTIVE_TIMER_NOTIFICATION_ID,
} from "@/src/lib/notifications/active-timer-notification-constants";
import { consumeColdStartNotificationPauseResponse } from "@/src/lib/notifications/register-notifications";

const BODY_REFRESH_MS = 30_000;

function formatElapsedBody(startedAt: string, zone: string): string {
  const sec = Math.max(
    0,
    Math.floor(now(zone).diff(parseDateTime(startedAt, zone), "seconds").seconds)
  );
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")} elapsed — Pause to stop`;
}

function notificationPermissionOk(
  settings: Notifications.NotificationPermissionsStatus
): boolean {
  if (settings.granted) return true;
  if (
    Platform.OS === "ios" &&
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  return false;
}

/**
 * Shows a local ongoing notification while a timer is running (today + pending queue merge).
 */
export function ActiveTimerNotificationSync() {
  const zone = useUserTimezone();
  const coldStartDone = useRef(false);
  const [bodyTick, setBodyTick] = useState(0);

  useEffect(() => {
    if (coldStartDone.current) return;
    coldStartDone.current = true;
    void consumeColdStartNotificationPauseResponse();
  }, []);

  const dateParam = useMemo(() => now(zone).toFormat("yyyy-MM-dd"), [zone]);
  const timersQueryKey = getGetApiV1TimersQueryKey({ date: dateParam });

  const { data } = useQuery({
    queryKey: timersQueryKey,
    queryFn: () => getApiV1Timers({ date: dateParam }),
  });

  const timersFromApi = useMemo(
    () => (data?.status === 200 ? data.data.data : []),
    [data]
  );

  const [timers, setTimers] = useState<TimerModel[]>([]);
  const [pendingInProgress, setPendingInProgress] = useState<
    Map<string, { started_at: string; tempId: string }>
  >(new Map());

  useEffect(() => {
    setTimers(timersFromApi);
  }, [timersFromApi]);

  useEffect(() => {
    void getPendingInProgressSessions().then(setPendingInProgress);
  }, [timersFromApi, data]);

  const displayedTimers = useMemo(() => {
    if (pendingInProgress.size === 0) return timers;
    return timers.map((t) => {
      if (t.timer_session_in_progress) return t;
      const p = pendingInProgress.get(t.id);
      if (p) {
        return {
          ...t,
          timer_session_in_progress: { id: p.tempId, started_at: p.started_at },
        };
      }
      return t;
    });
  }, [timers, pendingInProgress]);

  const activeTimer = useMemo(
    () => displayedTimers.find((t) => t.timer_session_in_progress != null) ?? null,
    [displayedTimers]
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!activeTimer?.timer_session_in_progress) return;
    const id = setInterval(() => {
      setBodyTick((x) => x + 1);
    }, BODY_REFRESH_MS);
    return () => clearInterval(id);
  }, [activeTimer?.timer_session_in_progress?.id]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const inProgress = activeTimer?.timer_session_in_progress;
    if (!activeTimer || !inProgress) {
      clearActiveTimerNotificationSnapshot();
      void Notifications.cancelScheduledNotificationAsync(ACTIVE_TIMER_NOTIFICATION_ID).catch(
        () => undefined
      );
      return;
    }

    if (getSuppressActiveTimerNotificationSync()) return;

    let cancelled = false;

    void (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync(ACTIVE_TIMER_CHANNEL_ID, {
            name: "Active timer",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: "default",
          });
        }

        const perm = await Notifications.getPermissionsAsync();
        let final = perm;
        if (!notificationPermissionOk(perm)) {
          final = await Notifications.requestPermissionsAsync();
        }
        if (!notificationPermissionOk(final) || cancelled) return;

        if (getSuppressActiveTimerNotificationSync()) return;

        const timerName = activeTimer.name?.trim() ? activeTimer.name : "Timer";

        setActiveTimerNotificationSnapshot({
          timerId: activeTimer.id,
          sessionId: inProgress.id,
          startedAt: inProgress.started_at,
          zone,
          timerName,
        });

        const trigger =
          Platform.OS === "android" ? { channelId: ACTIVE_TIMER_CHANNEL_ID } : null;

        await Notifications.scheduleNotificationAsync({
          identifier: ACTIVE_TIMER_NOTIFICATION_ID,
          content: {
            title: timerName,
            body: formatElapsedBody(inProgress.started_at, zone),
            categoryIdentifier: ACTIVE_TIMER_CATEGORY_ID,
            sticky: true,
            data: {
              timerId: activeTimer.id,
              sessionId: inProgress.id,
              startedAt: inProgress.started_at,
              zone,
            },
          },
          trigger,
        });
      } catch {
        // Permissions or scheduling may fail on unsupported environments.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTimer?.id,
    activeTimer?.name,
    activeTimer?.timer_session_in_progress?.id,
    activeTimer?.timer_session_in_progress?.started_at,
    zone,
    bodyTick,
  ]);

  return null;
}
