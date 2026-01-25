import { View, Text, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  useGetApiV1TimersId,
  useGetApiV1TimersIdStats,
  useGetApiV1TimerSessions,
  type TimerSession,
} from "@acme/api-client";
import { Button } from "@/src/components/Button/Button";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-gifted-charts";
import { useMemo } from "react";
import { DateTime } from "luxon";
import { parseDateTime, now, getUserTimezone } from "@/src/lib/date";

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

function formatDate(dateString: string): string {
  const date = parseDateTime(dateString);
  const current = now();
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

function calculateDuration(startedAt: string, endedAt: string | null): number {
  const start = parseDateTime(startedAt);
  const end = endedAt ? parseDateTime(endedAt) : now();
  return Math.max(0, Math.floor(end.diff(start, "seconds").seconds));
}

function getLastWeekDates() {
  const endDate = now();
  const startDate = endDate.minus({ days: 6 });
  
  return {
    start: startDate.toISODate() ?? "",
    end: endDate.toISODate() ?? "",
  };
}

function getDayLabel(dateString: string): string {
  const date = DateTime.fromISO(dateString, { zone: getUserTimezone() });
  return date.toFormat("EEE");
}

export default function TimerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: timerData, isLoading: isLoadingTimer, error: timerError } = useGetApiV1TimersId(id ?? "");
  const { data: sessionsData, isLoading: isLoadingSessions, error: sessionsError } = useGetApiV1TimerSessions();
  
  const weekDates = useMemo(() => getLastWeekDates(), []);
  const { data: statsData, isLoading: isLoadingStats } = useGetApiV1TimersIdStats(
    id ?? "",
    { start_date: weekDates.start, end_date: weekDates.end }
  );

  const timer = timerData?.status === 200 ? timerData.data.data : null;
  const allSessions = sessionsData?.status === 200 ? sessionsData.data.data : [];
  const sessions = allSessions.filter((session) => session.timer_id === id);
  const stats = statsData?.status === 200 ? statsData.data.data : [];

  const isLoading = isLoadingTimer || isLoadingSessions || isLoadingStats;
  const error = timerError || sessionsError;

  // Prepare chart data for the last 7 days
  const chartData = useMemo(() => {
    const days: Array<{
      value: number;
      label: string;
      frontColor: string;
      topLabelComponent: () => JSX.Element;
    }> = [];
    const statsMap = new Map(stats.map((s) => [s.date, s.total_timer_session_time]));
    
    for (let i = 6; i >= 0; i--) {
      const date = now().minus({ days: i });
      const dateStr = date.toISODate() ?? "";
      const totalSeconds = statsMap.get(dateStr) || 0;
      const minutes = Math.floor(totalSeconds / 60);
      
      days.push({
        value: minutes,
        label: getDayLabel(dateStr),
        frontColor: timer?.color ? `${timer.color}80` : "#7C3AED80",
        topLabelComponent: () => (
          <Text className="text-tf-text-secondary text-xs" style={{ fontSize: 10 }}>
            {minutes}m
          </Text>
        ),
      });
    }
    
    return days;
  }, [stats, timer?.color]);

  const maxMinutes = useMemo(() => {
    if (chartData.length === 0) return 60;
    return Math.max(...chartData.map((d) => d.value), 1);
  }, [chartData]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">Loading timer...</Text>
      </View>
    );
  }

  if (error || !timer) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          {error?.error ?? "Timer not found"}
        </Text>
        <Button variant="primary" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  const iconName = TIMER_TYPE_ICONS[timer.timer_type] || TIMER_TYPE_ICONS.other;
  const borderColor = timer.color ?? "#6B7280";

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center mr-2"
          >
            <Ionicons name="chevron-back" size={28} color={borderColor} />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Ionicons name={iconName} size={24} color={borderColor} style={{ marginRight: 8 }} />
              <Text className="text-3xl font-bold text-tf-text-primary">
                {timer.name}
              </Text>
            </View>
            <Text className="text-tf-text-secondary capitalize">
              {timer.timer_type}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/(root)/timers/${timer.id}/edit`)}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="pencil" size={24} color={borderColor} />
          </TouchableOpacity>
        </View>

        {/* Weekly Chart */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-tf-text-primary mb-4">
            Last 7 Days
          </Text>
          <View className="bg-tf-bg-secondary rounded-xl p-4">
            {chartData.length > 0 ? (
              <BarChart
                data={chartData}
                width={Dimensions.get("window").width - 96}
                barWidth={30}
                spacing={20}
                noOfSections={4}
                maxValue={maxMinutes}
                barBorderRadius={4}
                frontColor={timer.color ?? "#7C3AED"}
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisTextStyle={{ color: "#8A8DB3", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "#8A8DB3", fontSize: 10 }}
                isAnimated
                animationDuration={800}
                showYAxisIndices={false}
                showXAxisIndices={false}
              />
            ) : (
              <View className="h-40 items-center justify-center">
                <Text className="text-tf-text-secondary">No data for the last week</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sessions List */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-tf-text-primary mb-4">
            Sessions ({sessions.length})
          </Text>
          {sessions.length === 0 ? (
            <View className="bg-tf-bg-secondary rounded-xl p-6 items-center">
              <Text className="text-tf-text-secondary text-center">
                No sessions yet. Start a timer to create your first session!
              </Text>
            </View>
          ) : (
            <View>
              {sessions.map((session: TimerSession) => {
                const duration = calculateDuration(session.started_at, session.ended_at);
                const isActive = session.ended_at === null;

                return (
                  <View key={session.id} className="mb-3 bg-tf-bg-secondary rounded-xl p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-tf-text-primary font-semibold text-base">
                        {formatDate(session.started_at)}
                      </Text>
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
                      {session.ended_at && (
                        <Text className="text-tf-text-secondary text-sm">
                          Ended: {formatDate(session.ended_at)}
                        </Text>
                      )}
                    </View>
                    {session.note && (
                      <Text className="text-tf-text-secondary text-sm mt-2">{session.note}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
