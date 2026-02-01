import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
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
import { useTranslation } from "@/src/i18n";
import { DateNavigator } from "@/src/components/DateNavigator/DateNavigator";

const SWIPE_THRESHOLD = 60;

export default function TimersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const zone = useUserTimezone();
  const { t } = useTranslation();
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
   

  const activeTimer = useMemo(
    () => timers.find((t) => t.timer_session_in_progress != null) ?? null,
    [timers]
  );

  const handleDragEnd = useCallback(
    async ({ data: newData }: { data: TimerModel[] }) => {
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
    },
    [isToday, reorderMutation, queryClient, timersFromApi]
  );

  if (showFullscreenLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">{t("loadingTimers")}</Text>
      </View>
    );
  }

  if (showFullscreenError) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          {t("error")}: {error instanceof Error ? error.message : t("loadTimersError")}
        </Text>
        <Button variant="primary" onPress={() => refetch()}>
          {t("retry")}
        </Button>
      </View>
    );
  }

  function renderItem({ item, drag }: RenderItemParams<TimerModel>) {
    return (
      <ScaleDecorator>
        <View className="flex-row items-center mb-3">
          <View className="flex-1">
            <Timer
              timer={item}
              timersQueryKey={timersQueryKey}
              readOnly={!isToday}
              onLongPress={isToday ? drag : undefined}
            />
          </View>
        </View>
      </ScaleDecorator>
    );
  }

  const fixedFooter = activeTimer != null ? (
    <View className="px-6 pb-6 pt-4 bg-tf-bg-primary">
      <Timer
        timer={activeTimer}
        timersQueryKey={timersQueryKey}
        readOnly={!isToday}
        isActive
      />
    </View>
  ) : null;

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1 bg-tf-bg-primary">
        <View className="px-6 pt-16 pb-4 bg-tf-bg-primary">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-3xl font-bold text-tf-text-primary">
              {t("timers")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(root)/timers/create")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="p-2 rounded-full bg-tf-bg-secondary active:opacity-80"
            >
              <Ionicons name="add" size={24} color="#7C3AED" />
            </TouchableOpacity>
          </View>
          <DateNavigator
            value={selectedDate}
            onChange={setSelectedDate}
            zone={zone}
          />
        </View>

        {timers.length === 0 ? (
          <View className="flex-1">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
            >
              <Text className="text-tf-text-secondary text-center">
                {t("noTimersYet")}
              </Text>
            </ScrollView>
          </View>
        ) : (
          <View className="flex-1">
            <DraggableFlatList
              data={timers}
              keyExtractor={(item: TimerModel) => item.id}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
              containerStyle={{ flex: 1 }}
              contentContainerStyle={{ padding: 24, paddingTop: 8, paddingBottom: 16 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
              }
            />
            {fixedFooter}
          </View>
        )}
      </View>
    </GestureDetector>
  );
}
