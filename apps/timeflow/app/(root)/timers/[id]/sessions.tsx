import { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGetApiV1TimerSessions, useGetApiV1TimersId } from "@acme/api-client";
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

export default function TimerSessionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useUserTimezone();

  const { data: timerData, isLoading: isLoadingTimer, refetch: refetchTimer } =
    useGetApiV1TimersId(id ?? "");
  const { data: sessionsData, isLoading: isLoadingSessions, error, refetch: refetchSessions } =
    useGetApiV1TimerSessions();

  const timer = timerData?.status === 200 ? timerData.data.data : null;
  const allSessions = sessionsData?.status === 200 ? sessionsData.data.data : [];
  
  const sessions = allSessions.filter((session) => session.timer_id === id);

  if (isLoadingTimer || isLoadingSessions) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">Loading sessions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          Error: {error.error ?? "Failed to load sessions"}
        </Text>
      </View>
    );
  }

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTimer(), refetchSessions()]);
    setRefreshing(false);
  }, [refetchTimer, refetchSessions]);

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-3xl font-bold text-tf-text-primary mb-2">
          {timer?.name ?? "Timer"} Sessions
        </Text>
        <Text className="text-tf-text-secondary">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </Text>
      </View>

      {sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-tf-text-secondary text-center">
            No sessions yet. Start a timer to create your first session!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
          }
          renderItem={({ item }) => {
            const duration = calculateDuration(item.started_at, item.ended_at, zone);
            const isActive = item.ended_at === null;

            return (
              <TouchableOpacity
                className="mb-3 bg-tf-bg-secondary rounded-xl p-4"
                onPress={() =>
                  router.push(`/(root)/timers/${id}/sessions/${item.id}`)
                }
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <SessionTimeDisplay
                      currentIso={item.started_at}
                      originalIso={item.original_started_at}
                      formatDateFn={(iso) => formatDate(iso, zone)}
                    />
                  </View>
                  {isActive && (
                    <View className="bg-tf-success/20 px-2 py-1 rounded">
                      <Text className="text-tf-success text-xs font-semibold">Active</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-tf-text-secondary text-sm">
                    Duration: {formatTime(duration)}
                  </Text>
                  {item.ended_at && (
                    <View>
                      <SessionTimeDisplay
                        currentIso={item.ended_at}
                        originalIso={item.original_ended_at}
                        formatDateFn={(iso) => formatDate(iso, zone)}
                      />
                    </View>
                  )}
                </View>
                {item.note && (
                  <Text className="text-tf-text-secondary text-sm mt-2">{item.note}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
