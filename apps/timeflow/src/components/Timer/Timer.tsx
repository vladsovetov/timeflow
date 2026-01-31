import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
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
import { parseDateTime, now } from "@/src/lib/date";

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

interface TimerProps {
  timer: TimerModel;
  onStart?: () => void;
  onPause?: () => void;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function Timer({
  timer,
  onStart,
  onPause,
}: TimerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const inProgress = timer.timer_session_in_progress;
  const isRunning = inProgress !== null;
  const sessionId = inProgress?.id ?? null;

  const baseTime = timer.total_timer_session_time;
  const elapsedWhenRunning = inProgress
    ? Math.floor(now().diff(parseDateTime(inProgress.started_at), "seconds").seconds)
    : 0;
  const initialTime = baseTime + elapsedWhenRunning;

  const [time, setTime] = useState(initialTime);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createMutation = usePostApiV1TimerSessions();
  const patchMutation = usePatchApiV1TimerSessionsId();

  const isCreating = createMutation.isPending;
  const isPatching = patchMutation.isPending;
  const isBusy = isCreating || isPatching;

  useEffect(() => {
    const base = timer.total_timer_session_time;
    const elapsed = inProgress
      ? Math.floor(now().diff(parseDateTime(inProgress.started_at), "seconds").seconds)
      : 0;
    setTime(base + elapsed);
  }, [timer.total_timer_session_time, inProgress?.id, inProgress?.started_at]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prev: number) => prev + 1);
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

  async function handleStart() {
    const timerId = timer.id;
    if (isBusy || timerId == null || timerId === "") return;
    try {
      const res = await createMutation.mutateAsync({
        data: {
          timer_id: timerId,
          started_at: now().toISO() ?? undefined,
        },
      });
      if (res.status === 201) {
        await queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
        onStart?.();
      }
    } catch {
      // Create failed – don't start
    }
  }

  async function handlePause() {
    const sid = sessionId;
    if (isBusy || sid == null || sid === "") return;
    try {
      await patchMutation.mutateAsync({
        id: sid,
        data: { ended_at: now().toISO()! },
      });
      await queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
      onPause?.();
    } catch {
      onPause?.();
    }
  }

  function handleNavigateToSessions() {
    router.push(`/(root)/timers/${timer.id}/sessions`);
  }

  const iconName = TIMER_TYPE_ICONS[timer.timer_type] || TIMER_TYPE_ICONS.other;
  const accentColor = timer.color ?? (timer.category?.color ?? "#6B7280");
  const cardBgColor =
    timer.category?.color != null && timer.category.color !== ""
      ? `${timer.category.color}ED`
      : undefined;

  function handleCardPress() {
    router.push(`/(root)/timers/${timer.id}`);
  }

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      className={`rounded-xl p-4 flex-row items-center ${cardBgColor == null ? "bg-tf-bg-secondary" : ""}`}
      style={{
        borderWidth: 2,
        borderColor: accentColor,
        ...(cardBgColor != null ? { backgroundColor: cardBgColor } : {}),
      }}
      activeOpacity={0.7}
    >
      <View className="mr-4">
        <Ionicons name={iconName} size={32} color={accentColor} />
      </View>

      <View className="flex-1 items-center">
        <Text className="text-2xl font-mono font-semibold text-tf-text-primary">
          {formatTime(time)}
        </Text>
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

      <View className="ml-2 flex-row items-center gap-2">
        {/* <TouchableOpacity
          onPress={handleNavigateToSessions}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="time-outline" size={24} color={borderColor} />
        </TouchableOpacity> */}
        
        {isRunning ? (
          <TouchableOpacity
            onPress={handlePause}
            disabled={isBusy}
            className="w-12 h-12 rounded-full bg-tf-error items-center justify-center"
          >
            {isPatching ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="pause" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleStart}
            disabled={isBusy}
            className="w-12 h-12 rounded-full bg-tf-success items-center justify-center"
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="play" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
