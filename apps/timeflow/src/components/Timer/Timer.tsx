import { View, Text, TouchableOpacity } from "react-native";
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePostApiV1TimerSessions,
  usePatchApiV1TimerSessionsId,
  getGetApiV1TimersQueryKey,
  type Timer as TimerModel,
} from "@acme/api-client";
import { useUserTimezone } from "@/src/contexts/AppContext";
import { useTranslation } from "@/src/i18n";
import { getCategoryDisplayName } from "@/src/lib/category";
import { parseDateTime, now } from "@/src/lib/date";
import { syncQueueTimerSessions } from "@/src/lib/sync-queue-timer-sessions";
import { DurationDisplay } from "@/src/components/DurationDisplay/DurationDisplay";

const TIMER_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  work: "briefcase",
  study: "book",
  exercise: "barbell",
  break: "cafe",
  personal: "person",
  focus: "flash",
  meeting: "people",
  hobby: "color-palette",
  health: "medical",
  sleep: "moon",
  other: "ellipsis-horizontal",
};

const TEMP_SESSION_PREFIX = "temp-";

interface TimerProps {
  timer: TimerModel;
  onStart?: () => void;
  onPause?: () => void;
  onLongPress?: () => void;
  /** Query key for timers list (required for optimistic cache updates). */
  timersQueryKey?: readonly unknown[];
  /** When true, hide start/stop buttons (e.g. when viewing past/future days). Card remains tappable to open. */
  readOnly?: boolean;
  /** When true, applies enhanced visual styling to highlight the active/running timer. */
  isActive?: boolean;
}

function isTempSessionId(id: string | null): boolean {
  return id != null && id.startsWith(TEMP_SESSION_PREFIX);
}

/** Returns white or dark text color for contrast on the given hex background. */
function getContrastTextColor(hex: string): string {
  if (!hex || hex.length < 7) return "#1f2937";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#1f2937";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1f2937" : "#ffffff";
}

export function Timer({
  timer,
  onStart,
  onPause,
  timersQueryKey,
  readOnly = false,
  onLongPress,
  isActive = false,
}: TimerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const zone = useUserTimezone();
  const { t } = useTranslation();

  const inProgress = timer.timer_session_in_progress;
  const isRunning = inProgress !== null;
  const sessionId = inProgress?.id ?? null;

  const baseTime = timer.total_timer_session_time;
  const elapsedWhenRunning = inProgress
    ? Math.floor(now(zone).diff(parseDateTime(inProgress.started_at, zone), "seconds").seconds)
    : 0;

  const [staticTime, setStaticTime] = useState(baseTime + elapsedWhenRunning);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createMutation = usePostApiV1TimerSessions();
  const patchMutation = usePatchApiV1TimerSessionsId();

  const time =
    isRunning && inProgress
      ? baseTime +
        Math.floor(
          now(zone).diff(parseDateTime(inProgress.started_at, zone), "seconds").seconds
        )
      : staticTime;

  useEffect(() => {
    const base = timer.total_timer_session_time;
    const elapsed = inProgress
      ? Math.floor(now(zone).diff(parseDateTime(inProgress.started_at, zone), "seconds").seconds)
      : 0;
    setStaticTime(base + elapsed);
  }, [timer.total_timer_session_time, inProgress?.id, inProgress?.started_at, zone]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTick((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  type TimerWithNullableSession = Omit<TimerModel, "timer_session_in_progress"> & {
    timer_session_in_progress: TimerModel["timer_session_in_progress"] | null;
  };

  function updateTimersCache(updater: (timers: TimerModel[]) => TimerWithNullableSession[]) {
    if (!timersQueryKey) return;
    queryClient.setQueryData(timersQueryKey, (old: { data: { data: TimerModel[] } } | undefined) => {
      if (!old?.data?.data) return old;
      const updated = updater(old.data.data);
      return {
        ...old,
        data: {
          ...old.data,
          data: updated,
        },
      };
    });
  }

  function handleStart() {
    const timerId = timer.id;
    if (timerId == null || timerId === "") return;

    const startedAt = now(zone).toISO() ?? "";
    const tempId = `${TEMP_SESSION_PREFIX}${now(zone).toMillis()}`;

    if (timersQueryKey) {
      updateTimersCache((timers) =>
        timers.map((t) => {
          if (t.id === timerId) {
            return {
              ...t,
              timer_session_in_progress: { id: tempId, started_at: startedAt },
            };
          }
          return {
            ...t,
            timer_session_in_progress: null,
          };
        })
      );
      onStart?.();
    }

    createMutation.mutate(
      {
        data: {
          timer_id: timerId,
          started_at: startedAt,
        },
      },
      {
        onSuccess: (res) => {
          if (res.status === 201 && timersQueryKey && res.data?.data) {
            const session = res.data.data;
            updateTimersCache((timers) =>
              timers.map((t) => {
                if (t.id === timerId && t.timer_session_in_progress?.id === tempId) {
                  return {
                    ...t,
                    timer_session_in_progress: {
                      id: session.id,
                      started_at: session.started_at,
                    },
                  };
                }
                return t;
              })
            );
          }
        },
        onError: () => {
          syncQueueTimerSessions.enqueueCreateSession({
            timerId,
            startedAt,
            endedAt: null,
          });
        },
      }
    );
  }

  async function handlePause() {
    const sid = sessionId;
    if (sid == null || sid === "") return;

    const endedAt = now(zone).toISO() ?? "";

    if (timersQueryKey) {
      const elapsed = inProgress
        ? Math.floor(now(zone).diff(parseDateTime(inProgress.started_at, zone), "seconds").seconds)
        : 0;

      updateTimersCache((timers) =>
        timers.map((t) => {
          if (t.id === timer.id) {
            return {
              ...t,
              timer_session_in_progress: null,
              total_timer_session_time: t.total_timer_session_time + elapsed,
            };
          }
          return t;
        })
      );
      onPause?.();
    }

    if (isTempSessionId(sid)) {
      const merged = await syncQueueTimerSessions.updateCreateSessionWithEndedAt(timer.id, endedAt);
      if (merged) return; // Merged into pending CreateSession; no PATCH needed
      syncQueueTimerSessions.enqueueCreateSession({
        timerId: timer.id,
        startedAt: inProgress?.started_at ?? endedAt,
        endedAt,
      });
      return;
    }

    patchMutation.mutate(
      {
        id: sid,
        data: { ended_at: endedAt },
      },
      {
        onError: () => {
          syncQueueTimerSessions.enqueueEndSession({
            sessionId: sid,
            endedAt,
          });
        },
      }
    );
  }

  const iconName = TIMER_TYPE_ICONS[timer.timer_type] || TIMER_TYPE_ICONS.other;
  const accentColor = timer.color ?? (timer.category?.color ?? "#6B7280");

  function handleCardPress() {
    router.push(`/(root)/timers/${timer.id}`);
  }

  // Parse accent color for background tint when active
  const getActiveBackgroundColor = () => {
    if (!isActive || !accentColor || accentColor.length < 7) return undefined;
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return undefined;
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      onLongPress={onLongPress}
      className={`rounded-xl p-3 flex-row items-center ${isActive ? "" : "bg-tf-bg-secondary"}`}
      style={[
        {
          borderWidth: isActive ? 3 : 2,
          borderColor: accentColor,
        },
        isActive && {
          backgroundColor: getActiveBackgroundColor(),
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 16,
          elevation: 12,
          transform: [{ scale: 1.02 }],
        },
      ]}
      activeOpacity={0.7}
    >
      <View className="mr-4">
        <Ionicons name={iconName} size={isActive ? 36 : 32} color={accentColor} />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-base font-semibold text-tf-text-primary" numberOfLines={1}>
            {timer.name}
          </Text>
          {timer.category != null && timer.category.color != null && timer.category.color !== "" && (
            <View
              className="px-2 py-0.5 rounded-md"
              style={{ backgroundColor: timer.category.color }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: getContrastTextColor(timer.category.color) }}
                numberOfLines={1}
              >
                {getCategoryDisplayName(timer.category, t, timer.category.name)}
              </Text>
            </View>
          )}
        </View>
        <DurationDisplay seconds={time} size="lg" className="mt-1" />
        {timer.min_time != null && timer.min_time > 0 && (
          <View className="w-full mt-2 h-1.5 rounded-full bg-tf-bg-tertiary overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (time / timer.min_time) * 100)}%`,
                backgroundColor: accentColor,
              }}
            />
          </View>
        )}
      </View>

      {!readOnly && (
        <View className="ml-2 flex-row items-center gap-2">
          {isRunning ? (
            <TouchableOpacity
              onPress={handlePause}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              <Ionicons name="pause" size={30} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleStart}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              <Ionicons name="play" size={30} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
