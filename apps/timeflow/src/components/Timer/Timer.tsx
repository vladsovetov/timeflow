import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePostApiV1TimerSessions,
  usePatchApiV1TimerSessionsId,
  getGetApiV1TimersQueryKey,
  type Timer as TimerModel,
} from "@acme/api-client";

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
  isRunning?: boolean;
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
  isRunning = false,
}: TimerProps) {
  const initialTime = timer.total_timer_session_time;
  const [time, setTime] = useState(initialTime);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const createMutation = usePostApiV1TimerSessions();
  const patchMutation = usePatchApiV1TimerSessionsId();

  const isCreating = createMutation.isPending;
  const isPatching = patchMutation.isPending;
  const isBusy = isCreating || isPatching;

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

  useEffect(() => {
    if (!isRunning) {
      setTime(initialTime);
    }
  }, [initialTime, isRunning]);

  async function handleStart() {
    if (isBusy) return;
    try {
      const res = await createMutation.mutateAsync({
        data: {
          timer_id: timer.id,
          started_at: new Date().toISOString(),
        },
      });
      if (res.status === 201 && res.data?.data?.id) {
        setSessionId(res.data.data.id);
        onStart?.();
      }
    } catch {
      // Create failed – don't start
    }
  }

  async function handlePause() {
    if (isBusy || !sessionId) return;
    try {
      await patchMutation.mutateAsync({
        id: sessionId,
        data: { ended_at: new Date().toISOString() },
      });
      await queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
      setSessionId(null);
      onPause?.();
    } catch {
      setSessionId(null);
      onPause?.();
    }
  }

  const iconName = TIMER_TYPE_ICONS[timer.timer_type] || TIMER_TYPE_ICONS.other;
  const borderColor = timer.color ?? "#6B7280";

  return (
    <View
      className="bg-tf-bg-secondary rounded-xl p-4 flex-row items-center"
      style={{ borderWidth: 2, borderColor }}
    >
      <View className="mr-4">
        <Ionicons name={iconName} size={32} color={borderColor} />
      </View>

      <View className="flex-1 items-center">
        <Text className="text-2xl font-mono font-semibold text-tf-text-primary">
          {formatTime(time)}
        </Text>
      </View>

      <View className="ml-4">
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
    </View>
  );
}
