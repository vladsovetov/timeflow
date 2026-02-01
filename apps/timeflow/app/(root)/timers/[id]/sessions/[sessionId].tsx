import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  useGetApiV1TimersId,
  useGetApiV1TimerSessionsId,
  useDeleteApiV1TimerSessionsId,
  getGetApiV1TimersIdQueryKey,
  getGetApiV1TimersQueryKey,
  getGetApiV1TimerSessionsQueryKey,
  getGetApiV1TimerSessionsIdQueryKey,
} from "@acme/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/src/components/Button/Button";
import { Ionicons } from "@expo/vector-icons";
import { useUserTimezone } from "@/src/contexts/AppContext";
import { parseDateTime, now } from "@/src/lib/date";
import { SessionTimeDisplay } from "@/src/components/SessionTimeDisplay/SessionTimeDisplay";

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatDate(dateString: string, zone: string): string {
  const date = parseDateTime(dateString, zone);
  const current = now(zone);
  const today = current.startOf("day");
  const sessionDate = date.startOf("day");

  if (sessionDate.equals(today)) {
    return `Today, ${date.toLocaleString({ hour: "numeric", minute: "2-digit" })}`;
  }

  const yesterday = today.minus({ days: 1 });
  if (sessionDate.equals(yesterday)) {
    return `Yesterday, ${date.toLocaleString({ hour: "numeric", minute: "2-digit" })}`;
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  if (date.year !== current.year) {
    formatOptions.year = "numeric";
  }

  return date.toLocaleString(formatOptions);
}

function calculateDuration(startedAt: string, endedAt: string | null, zone: string): number {
  const start = parseDateTime(startedAt, zone);
  const end = endedAt ? parseDateTime(endedAt, zone) : now(zone);
  return Math.max(0, Math.floor(end.diff(start, "seconds").seconds));
}

export default function SessionDetailsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const zone = useUserTimezone();
  const insets = useSafeAreaInsets();

  const { data: timerData, isLoading: isLoadingTimer, error: timerError, refetch: refetchTimer } =
    useGetApiV1TimersId(id ?? "");
  const { data: sessionData, isLoading: isLoadingSession, error: sessionError, refetch: refetchSession } =
    useGetApiV1TimerSessionsId(sessionId ?? "");

  const deleteMutation = useDeleteApiV1TimerSessionsId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
        if (id) queryClient.invalidateQueries({ queryKey: getGetApiV1TimersIdQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimerSessionsQueryKey() });
        if (sessionId) queryClient.invalidateQueries({ queryKey: getGetApiV1TimerSessionsIdQueryKey(sessionId) });
        router.back();
      },
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTimer(), refetchSession()]);
    setRefreshing(false);
  }, [refetchTimer, refetchSession]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (sessionId) deleteMutation.mutate({ id: sessionId });
          },
        },
      ]
    );
  };

  const timer = timerData?.status === 200 ? timerData.data.data : null;
  const session = sessionData?.status === 200 ? sessionData.data.data : null;

  const isLoading = isLoadingTimer || isLoadingSession;
  const error = timerError || sessionError;

  if (isLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">Loading session...</Text>
      </View>
    );
  }

  if (error || !session || !timer) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          {error?.error ?? "Session not found"}
        </Text>
        <Button variant="primary" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  const duration = calculateDuration(session.started_at, session.ended_at, zone);
  const isActive = session.ended_at === null;
  const borderColor = timer.color ?? "#6B7280";

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
        }
      >
        <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center mr-2"
          >
            <Ionicons name="chevron-back" size={28} color={borderColor} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-tf-text-primary">
              {timer.name}
            </Text>
            <Text className="text-tf-text-secondary text-sm">Session</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(root)/timers/${id}/sessions/${sessionId}/edit`)
            }
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="pencil" size={24} color={borderColor} />
          </TouchableOpacity>
        </View>

        <View className="px-6 mb-6">
          <View className="bg-tf-bg-secondary rounded-xl p-4">
            {isActive && (
              <View className="bg-tf-success/20 px-2 py-1 rounded self-start mb-3">
                <Text className="text-tf-success text-xs font-semibold">Active</Text>
              </View>
            )}
            <View className="mb-3">
              <SessionTimeDisplay
                currentIso={session.started_at}
                originalIso={session.original_started_at}
                formatDateFn={(iso) => formatDate(iso, zone)}
                label="Started"
              />
            </View>
            {session.ended_at && (
              <View className="mb-3">
                <SessionTimeDisplay
                  currentIso={session.ended_at}
                  originalIso={session.original_ended_at}
                  formatDateFn={(iso) => formatDate(iso, zone)}
                  label="Ended"
                />
              </View>
            )}
            <Text className="text-tf-text-secondary text-sm mb-1">Duration</Text>
            <Text className="text-tf-text-primary text-base">
              {formatTime(duration)}
            </Text>
            {session.note ? (
              <>
                <Text className="text-tf-text-secondary text-sm mt-3 mb-1">Note</Text>
                <Text className="text-tf-text-primary text-base">{session.note}</Text>
              </>
            ) : null}
          </View>

          <Button
            variant="danger"
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            className="mt-6"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Session"}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
