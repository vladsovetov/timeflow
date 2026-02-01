import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getApiV1Timers,
  getApiV1TimerSessions,
  getGetApiV1TimersQueryKey,
  getGetApiV1TimerSessionsQueryKey,
} from "@acme/api-client";
import type { Timer, TimerSession } from "@acme/api-client";
import { DateTime } from "luxon";
import { PieChart } from "react-native-gifted-charts";
import { useUserTimezone } from "@/src/contexts/AppContext";
import { parseDateTime, now } from "@/src/lib/date";
import { useTranslation } from "@/src/i18n";
import { DateNavigator } from "@/src/components/DateNavigator/DateNavigator";

const SWIPE_THRESHOLD = 60;
const SECONDS_PER_DAY = 24 * 60 * 60;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

function sessionOverlapsDay(
  session: TimerSession,
  dayStart: DateTime,
  dayEnd: DateTime,
  zone: string
): boolean {
  const start = parseDateTime(session.started_at, zone);
  const end = session.ended_at
    ? parseDateTime(session.ended_at, zone)
    : now(zone);
  return start < dayEnd && end > dayStart;
}

function sessionClipToDay(
  session: TimerSession,
  dayStart: DateTime,
  dayEnd: DateTime,
  zone: string
): { startMs: number; endMs: number } {
  const start = parseDateTime(session.started_at, zone);
  const end = session.ended_at
    ? parseDateTime(session.ended_at, zone)
    : now(zone);
  const clipStart = start < dayStart ? dayStart : start;
  const clipEnd = end > dayEnd ? dayEnd : end;
  return {
    startMs: clipStart.toMillis(),
    endMs: clipEnd.toMillis(),
  };
}

type SessionWithTimer = TimerSession & {
  timer: Timer;
};

export default function StatsScreen() {
  const zone = useUserTimezone();
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(() =>
    now(zone).startOf("day")
  );
  const [groupByCategory, setGroupByCategory] = useState(true);
  const dateParam = useMemo(
    () => selectedDate.toFormat("yyyy-MM-dd"),
    [selectedDate]
  );

  const timersQueryKey = getGetApiV1TimersQueryKey({ date: dateParam });
  const { data: timersRes, isLoading: loadingTimers, refetch: refetchTimers } =
    useQuery({
      queryKey: timersQueryKey,
      queryFn: () => getApiV1Timers({ date: dateParam }),
      placeholderData: keepPreviousData,
    });

  const sessionsQueryKey = getGetApiV1TimerSessionsQueryKey();
  const {
    data: sessionsRes,
    isLoading: loadingSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: () => getApiV1TimerSessions(),
    placeholderData: keepPreviousData,
  });

  const timers = useMemo(
    () => (timersRes?.status === 200 ? timersRes.data.data : []),
    [timersRes]
  );
  const allSessions = useMemo(
    () => (sessionsRes?.status === 200 ? sessionsRes.data.data : []),
    [sessionsRes]
  );

  const timerById = useMemo(() => {
    const map = new Map<string, Timer>();
    for (const t of timers) map.set(t.id, t);
    return map;
  }, [timers]);

  const dayStart = useMemo(
    () => selectedDate.startOf("day"),
    [selectedDate]
  );
  const dayEnd = useMemo(() => selectedDate.endOf("day"), [selectedDate]);

  const sessionsOnDay = useMemo(() => {
    const list: SessionWithTimer[] = [];
    for (const s of allSessions) {
      if (!sessionOverlapsDay(s, dayStart, dayEnd, zone)) continue;
      const timer = timerById.get(s.timer_id);
      if (!timer) continue;
      list.push({ ...s, timer });
    }
    list.sort(
      (a, b) =>
        parseDateTime(a.started_at, zone).toMillis() -
        parseDateTime(b.started_at, zone).toMillis()
    );
    return list;
  }, [allSessions, timerById, dayStart, dayEnd, zone]);

  const sleepSeconds = useMemo(() => {
    return timers
      .filter((t) => t.timer_type === "sleep")
      .reduce((sum, t) => sum + t.total_timer_session_time, 0);
  }, [timers]);

  const awakeSeconds = useMemo(
    () => Math.max(0, SECONDS_PER_DAY - sleepSeconds),
    [sleepSeconds]
  );

  const nonSleepSessionSeconds = useMemo(() => {
    let total = 0;
    for (const s of sessionsOnDay) {
      if (s.timer.timer_type === "sleep") continue;
      const { startMs, endMs } = sessionClipToDay(s, dayStart, dayEnd, zone);
      total += (endMs - startMs) / 1000;
    }
    return total;
  }, [sessionsOnDay, dayStart, dayEnd, zone]);

  const percentAwakeFilled =
    awakeSeconds > 0
      ? Math.min(100, (nonSleepSessionSeconds / awakeSeconds) * 100)
      : 0;

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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTimers(), refetchSessions()]);
    setRefreshing(false);
  }, [refetchTimers, refetchSessions]);

  const lastKnownDateRef = useRef(now(zone).toFormat("yyyy-MM-dd"));
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDateStr = now(zone).toFormat("yyyy-MM-dd");
      const lastKnown = lastKnownDateRef.current;
      if (currentDateStr !== lastKnown) {
        lastKnownDateRef.current = currentDateStr;
        if (selectedDate.toFormat("yyyy-MM-dd") === lastKnown) {
          setSelectedDate(now(zone).startOf("day"));
          refetchTimers();
          refetchSessions();
        }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [zone, selectedDate, refetchTimers, refetchSessions]);

  const isLoading = loadingTimers || loadingSessions;
  const hasCachedData = timersRes != null && sessionsRes != null;

  if (isLoading && !hasCachedData) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">{t("loadingStats")}</Text>
      </View>
    );
  }

  const timelineWidth = Dimensions.get("window").width - 48;
  const timelineTotalMs = dayEnd.toMillis() - dayStart.toMillis();

  const renderTimelineBlocks = (sessions: SessionWithTimer[]) => {
    return sessions.map((s) => {
      const { startMs, endMs } = sessionClipToDay(s, dayStart, dayEnd, zone);
      const left =
        ((startMs - dayStart.toMillis()) / timelineTotalMs) * timelineWidth;
      const width = Math.max(
        4,
        ((endMs - startMs) / timelineTotalMs) * timelineWidth
      );
      const color =
        s.timer.color ??
        s.timer.category?.color ??
        "#7C3AED";
      return (
        <View
          key={s.id}
          className="absolute h-6 rounded"
          style={{
            left,
            width,
            backgroundColor: color,
          }}
        />
      );
    });
  };

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, SessionWithTimer[]>();
    for (const s of sessionsOnDay) {
      const key = s.timer.category?.name ?? s.timer.name ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [sessionsOnDay]);

  const groupedByTimerType = useMemo(() => {
    const map = new Map<string, SessionWithTimer[]>();
    for (const s of sessionsOnDay) {
      const key = s.timer.timer_type;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [sessionsOnDay]);

  type LegendItem = { key: string; label: string; color: string };
  const legendItems = useMemo((): LegendItem[] => {
    const items: LegendItem[] = [];
    if (groupByCategory) {
      const seen = new Set<string>();
      for (const s of sessionsOnDay) {
        const key = s.timer.category?.name ?? s.timer.name ?? "Other";
        if (seen.has(key)) continue;
        seen.add(key);
        const color =
          s.timer.category?.color ?? s.timer.color ?? "#7C3AED";
        items.push({ key, label: key, color });
      }
      items.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      const seen = new Set<string>();
      for (const s of sessionsOnDay) {
        const key = s.timer.timer_type;
        if (seen.has(key)) continue;
        seen.add(key);
        const color =
          s.timer.color ?? s.timer.category?.color ?? "#7C3AED";
        const label =
          key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        items.push({ key, label, color });
      }
      items.sort((a, b) => a.label.localeCompare(b.label));
    }
    if (
      awakeSeconds > 0 &&
      nonSleepSessionSeconds < awakeSeconds - 0.5
    ) {
      items.push({
        key: "__free__",
        label: t("free"),
        color: "#1A1A33",
      });
    }
    return items;
  }, [sessionsOnDay, groupByCategory, awakeSeconds, nonSleepSessionSeconds, t]);

  type PieSlice = {
    value: number;
    color: string;
    text: string;
    label: string;
  };
  const pieData = useMemo((): PieSlice[] => {
    if (awakeSeconds <= 0)
      return [{ value: 100, color: "#1A1A33", text: t("na"), label: t("na") }];
    const groups = groupByCategory ? groupedByCategory : groupedByTimerType;
    const data: PieSlice[] = [];
    let sessionTotal = 0;
    for (const [label, sessions] of groups) {
      let seconds = 0;
      let color = "#7C3AED";
      for (const s of sessions) {
        if (s.timer.timer_type === "sleep") continue;
        const { startMs, endMs } = sessionClipToDay(s, dayStart, dayEnd, zone);
        seconds += (endMs - startMs) / 1000;
        if (color === "#7C3AED") {
          color =
            groupByCategory
              ? (s.timer.category?.color ?? s.timer.color ?? "#7C3AED")
              : (s.timer.color ?? s.timer.category?.color ?? "#7C3AED");
        }
      }
      if (seconds <= 0) continue;
      const pct = (seconds / awakeSeconds) * 100;
      sessionTotal += pct;
      const displayLabel = groupByCategory
        ? label
        : label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
      data.push({
        value: pct,
        color,
        text: `${Math.round(pct)}%`,
        label: displayLabel,
      });
    }
    const freePct = Math.max(0, 100 - sessionTotal);
    if (freePct > 0.5) {
      data.push({
        value: freePct,
        color: "#1A1A33",
        text: `${Math.round(freePct)}%`,
        label: t("free"),
      });
    }
    return data.filter((d) => d.value > 0.5);
  }, [
    awakeSeconds,
    groupByCategory,
    groupedByCategory,
    groupedByTimerType,
    dayStart,
    dayEnd,
    zone,
    t,
  ]);

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-1 bg-tf-bg-primary">
        <View className="px-6 pt-16 pb-4 bg-tf-bg-primary">
          <Text className="text-3xl font-bold text-tf-text-primary mb-2">
            {t("stats")}
          </Text>
          <DateNavigator
            value={selectedDate}
            onChange={setSelectedDate}
            zone={zone}
          />
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7C3AED"
            />
          }
        >
          <View className="px-6 mb-6">
            <View className="bg-tf-bg-secondary rounded-xl p-4 mb-4">
              <Text className="text-lg font-semibold text-tf-text-primary mb-2">
                {t("awakeTime")}
              </Text>
              <Text className="text-2xl font-bold text-tf-text-primary">
                {formatDuration(awakeSeconds)}
              </Text>
              <Text className="text-sm text-tf-text-secondary mt-1">
                {t("awakeTimeSubtitle")} ({formatDuration(sleepSeconds)})
              </Text>
            </View>

            <View className="bg-tf-bg-secondary rounded-xl p-4 mb-4">
              <Text className="text-lg font-semibold text-tf-text-primary mb-3">
                {t("sessionsTimeline")}
              </Text>
              {legendItems.length > 0 && (
                <View className="flex-row flex-wrap gap-x-4 gap-y-2 mb-3">
                  {legendItems.map(({ key, label, color }) => (
                    <View
                      key={key}
                      className="flex-row items-center"
                      style={{ marginRight: 8 }}
                    >
                      <View
                        className="w-3 h-3 rounded-sm mr-1.5"
                        style={{ backgroundColor: color }}
                      />
                      <Text
                        className="text-sm text-tf-text-secondary"
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                onPress={() => setGroupByCategory((v) => !v)}
                className="flex-row items-center mb-3"
              >
                <View
                  className="w-5 h-5 rounded border-2 mr-2 items-center justify-center"
                  style={{
                    borderColor: groupByCategory ? "#7C3AED" : "#6B7280",
                    backgroundColor: groupByCategory ? "#7C3AED" : "transparent",
                  }}
                >
                  {groupByCategory && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text className="text-tf-text-secondary">
                  {t("groupByCategory")}
                </Text>
              </Pressable>
              {sessionsOnDay.length === 0 ? (
                <Text className="text-tf-text-muted text-sm mt-2">
                  {t("noSessionsOnDay")}
                </Text>
              ) : (
                <View>
                  <View className="mb-3">
                    <Text
                      className="text-xs text-tf-text-muted mb-1"
                      numberOfLines={1}
                    >
                      {t("all")}
                    </Text>
                    <View
                      className="rounded-lg overflow-hidden bg-tf-bg-tertiary h-6 relative"
                      style={{ width: timelineWidth }}
                    >
                      {renderTimelineBlocks(sessionsOnDay)}
                    </View>
                  </View>
                  {groupByCategory
                    ? groupedByCategory.map(([label, sessions]) => (
                        <View key={label} className="mb-3">
                          <Text
                            className="text-xs text-tf-text-muted mb-1"
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                          <View
                            className="rounded-lg overflow-hidden bg-tf-bg-tertiary h-6 relative"
                            style={{ width: timelineWidth }}
                          >
                            {renderTimelineBlocks(sessions)}
                          </View>
                        </View>
                      ))
                    : groupedByTimerType.map(([label, sessions]) => (
                        <View key={label} className="mb-3">
                          <Text
                            className="text-xs text-tf-text-muted mb-1"
                            numberOfLines={1}
                          >
                            {label.charAt(0).toUpperCase() +
                              label.slice(1).toLowerCase()}
                          </Text>
                          <View
                            className="rounded-lg overflow-hidden bg-tf-bg-tertiary h-6 relative"
                            style={{ width: timelineWidth }}
                          >
                            {renderTimelineBlocks(sessions)}
                          </View>
                        </View>
                      ))}
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-xs text-tf-text-muted">0:00</Text>
                    <Text className="text-xs text-tf-text-muted">24:00</Text>
                  </View>
                </View>
              )}
            </View>

            <View className="bg-tf-bg-secondary rounded-xl p-4">
              <Text className="text-lg font-semibold text-tf-text-primary mb-3">
                {t("percentAwakeInSessions")}
              </Text>
              {awakeSeconds > 0 && pieData.length > 0 ? (
                <View className="items-center py-4">
                  <PieChart
                    data={pieData}
                    donut
                    radius={80}
                    innerRadius={50}
                    centerLabelComponent={() => (
                      <Text className="text-tf-text-primary text-xl font-bold">
                        {Math.round(percentAwakeFilled)}%
                      </Text>
                    )}
                    showText
                    textColor="#C7C9E3"
                    textSize={12}
                  />
                  <Text className="text-tf-text-secondary text-sm mt-2">
                    {formatDuration(Math.round(nonSleepSessionSeconds))} {t("of")}{" "}
                    {formatDuration(awakeSeconds)} {t("awake")}
                  </Text>
                  <View className="mt-4 w-full">
                    {pieData.map((slice, idx) => (
                      <View
                        key={slice.label + String(idx)}
                        className="flex-row items-center justify-between py-2 border-b border-tf-bg-tertiary last:border-b-0"
                      >
                        <View className="flex-row items-center flex-1 min-w-0">
                          <View
                            className="w-3 h-3 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: slice.color }}
                          />
                          <Text
                            className="text-tf-text-primary font-medium"
                            numberOfLines={1}
                          >
                            {slice.label}
                          </Text>
                        </View>
                        <Text className="text-tf-text-secondary font-medium flex-shrink-0 ml-2">
                          {slice.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text className="text-tf-text-muted text-sm">
                  {t("noAwakeTimeOrSessions")}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}
