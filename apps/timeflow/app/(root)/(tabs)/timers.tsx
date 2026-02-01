import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { View, Text, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getApiV1Timers,
  usePatchApiV1TimersReorder,
  getGetApiV1TimersQueryKey,
} from "@acme/api-client";
import { DateTime } from "luxon";
import { Button } from "@/src/components/Button/Button";
import { Timer } from "@/src/components/Timer/Timer";
import type { Timer as TimerModel } from "@acme/api-client";
import { useUserTimezone } from "@/src/contexts/AppContext";
import { now } from "@/src/lib/date";

const SWIPE_THRESHOLD = 60;

function formatDateLabel(dt: DateTime, zone: string): string {
  const today = now(zone).startOf("day");
  const dayStart = dt.startOf("day");
  const diffDays = dayStart.diff(today, "days").days;
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > -7 && diffDays < 0) return dayStart.toFormat("cccc"); // last week: "Monday"
  if (diffDays > 0 && diffDays < 7) return dayStart.toFormat("cccc"); // next week
  return dayStart.toFormat("MMM d, yyyy");
}

export default function TimersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const zone = useUserTimezone();
  const [selectedDate, setSelectedDate] = useState(() => now(zone).startOf("day"));
  const dateParam = useMemo(
    () => selectedDate.toFormat("yyyy-MM-dd"),
    [selectedDate]
  );
  const isToday = selectedDate.hasSame(now(zone), "day");

  const timersQueryKey = getGetApiV1TimersQueryKey({ date: dateParam });
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: timersQueryKey,
    queryFn: () => getApiV1Timers({ date: dateParam }),
    placeholderData: keepPreviousData,
  });

  const reorderMutation = usePatchApiV1TimersReorder();
  const timersFromApi = useMemo(
    () => (data?.status === 200 ? data.data.data : []),
    [data]
  );
  const [timers, setTimers] = useState<TimerModel[]>([]);

  useEffect(() => {
    setTimers(timersFromApi);
  }, [timersFromApi]);

  const goToPrevDay = useCallback(
    () => setSelectedDate((d) => d.minus({ days: 1 })),
    []
  );
  const goToNextDay = useCallback(
    () => setSelectedDate((d) => d.plus({ days: 1 })),
    []
  );
  const goToToday = useCallback(
    () => setSelectedDate(now(zone).startOf("day")),
    [zone]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .onEnd((e) => {
          if (Math.abs(e.translationX) < SWIPE_THRESHOLD) return;
          if (e.translationX < 0) {
            scheduleOnRN(goToNextDay);
          } else {
            scheduleOnRN(goToPrevDay);
          }
        }),
    [goToPrevDay, goToNextDay]
  );

  const hasCachedData = data != null && dataUpdatedAt > 0;
  const showFullscreenLoading = isLoading && !hasCachedData;
  const showFullscreenError = error != null && !hasCachedData;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const lastKnownDateRef = useRef(now(zone).toFormat("yyyy-MM-dd"));
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDateStr = now(zone).toFormat("yyyy-MM-dd");
      const lastKnown = lastKnownDateRef.current;
      if (currentDateStr !== lastKnown) {
        lastKnownDateRef.current = currentDateStr;
        if (selectedDate.toFormat("yyyy-MM-dd") === lastKnown) {
          setSelectedDate(now(zone).startOf("day"));
          refetch();
        }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [zone, selectedDate, refetch]);

  if (showFullscreenLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">Loading timers...</Text>
      </View>
    );
  }

  if (showFullscreenError) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          Error: {error instanceof Error ? error.message : "Failed to load timers"}
        </Text>
        <Button variant="primary" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  async function handleDragEnd({ data: newData }: { data: TimerModel[] }) {
    if (!isToday) return;
    setTimers(newData);
    try {
      const res = await reorderMutation.mutateAsync({
        data: { timer_ids: newData.map((t) => t.id) },
      });
      if (res.status === 200) {
        await queryClient.invalidateQueries({
          queryKey: getGetApiV1TimersQueryKey(),
        });
      }
    } catch {
      setTimers(timersFromApi);
    }
  }

  const activeTimer = useMemo(
    () => timers.find((t) => t.timer_session_in_progress != null) ?? null,
    [timers]
  );

  function renderItem({ item, drag, isActive }: RenderItemParams<TimerModel>) {
    return (
      <ScaleDecorator>
        <View className="flex-row items-center mb-3">
          {isToday && (
            <Pressable
              onLongPress={drag}
              disabled={isActive}
              className="mr-2 py-4 px-1 justify-center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="reorder-three" size={24} color="#6B7280" />
            </Pressable>
          )}
          <View className="flex-1">
            <Timer
              timer={item}
              timersQueryKey={timersQueryKey}
              readOnly={!isToday}
            />
          </View>
        </View>
      </ScaleDecorator>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1 bg-tf-bg-primary">
        <View className="px-6 pt-16 pb-4">
          <Text className="text-3xl font-bold text-tf-text-primary mb-2">
            Timers
          </Text>
          <Text className="text-base text-tf-text-secondary mb-3">
            {formatDateLabel(selectedDate, zone)}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={goToPrevDay}
              className="flex-1 py-2 rounded-lg items-center justify-center bg-tf-bg-secondary"
            >
              <Ionicons name="chevron-back" size={24} color="#C7C9E3" />
            </Pressable>
            <Pressable
              onPress={goToToday}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${
                isToday ? "bg-tf-purple" : "bg-tf-bg-secondary"
              }`}
            >
              <Text
                className={`font-medium ${
                  isToday ? "text-white" : "text-tf-text-secondary"
                }`}
              >
                Today
              </Text>
            </Pressable>
            <Pressable
              onPress={goToNextDay}
              className="flex-1 py-2 rounded-lg items-center justify-center bg-tf-bg-secondary"
            >
              <Ionicons name="chevron-forward" size={24} color="#C7C9E3" />
            </Pressable>
          </View>
        </View>

        {timers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-tf-text-secondary text-center mb-6">
            No timers yet. Create your first timer to get started!
          </Text>
          <Button
            variant="primary"
            onPress={() => router.push("/(root)/timers/create")}
          >
            Create Timer
          </Button>
        </View>
      ) : (
        <View className="flex-1 justify-between">
          <DraggableFlatList
            data={timers}
            keyExtractor={(item: TimerModel) => item.id}
            onDragEnd={handleDragEnd}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 24, paddingTop: 8 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
            }
          />
          <View className="px-6 pb-6">
            {activeTimer != null && (
              <View className="mb-3">
                <Timer
                  timer={activeTimer}
                  timersQueryKey={timersQueryKey}
                  readOnly={!isToday}
                />
              </View>
            )}
            <Button
              variant="primary"
              onPress={() => router.push("/(root)/timers/create")}
              className="w-full"
            >
              Create Timer
            </Button>
          </View>
        </View>
      )}
      </View>
    </GestureDetector>
  );
}
