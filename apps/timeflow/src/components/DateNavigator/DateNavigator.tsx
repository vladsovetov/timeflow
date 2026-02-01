import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { DateTime } from "luxon";
import { useTranslation } from "@/src/i18n";
import { now, formatDateLabel } from "@/src/lib/date";

export interface DateNavigatorProps {
  value: DateTime;
  onChange: (date: DateTime) => void;
  zone: string;
}

export function DateNavigator({ value, onChange, zone }: DateNavigatorProps) {
  const { t, locale } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedDate = value.startOf("day");
  const todayStart = now(zone).startOf("day");
  const isToday = selectedDate.hasSame(todayStart, "day");
  const canGoNext = selectedDate < todayStart;

  const goToPrevDay = useCallback(
    () => onChange(selectedDate.minus({ days: 1 })),
    [selectedDate, onChange]
  );
  const goToNextDay = useCallback(() => {
    const nextDay = selectedDate.plus({ days: 1 });
    if (nextDay <= todayStart) {
      onChange(nextDay);
    }
  }, [selectedDate, todayStart, onChange]);
  const goToToday = useCallback(
    () => onChange(now(zone).startOf("day")),
    [zone, onChange]
  );

  const clampToToday = useCallback(
    (dt: DateTime) => {
      const dayStart = dt.startOf("day");
      return dayStart > todayStart ? todayStart : dayStart;
    },
    [todayStart]
  );

  const onDatePickerChange = useCallback(
    (event: { type: string }, date: Date | undefined) => {
      if (Platform.OS === "android") setShowDatePicker(false);
      if (event.type === "set" && date) {
        const dt = DateTime.fromJSDate(date, { zone });
        onChange(clampToToday(dt));
      }
    },
    [zone, onChange, clampToToday]
  );

  const onIOSDateChange = useCallback(
    (_event: unknown, date: Date | undefined) => {
      if (date) {
        const dt = DateTime.fromJSDate(date, { zone });
        onChange(clampToToday(dt));
      }
    },
    [zone, onChange, clampToToday]
  );

  return (
    <>
      <Text className="text-base text-tf-text-secondary mb-3">
        {formatDateLabel(selectedDate, zone, t, locale)}
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
            {t("today")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="flex-1 py-2 rounded-lg items-center justify-center bg-tf-bg-secondary"
        >
          <Text className="font-medium text-tf-text-secondary">
            {t("selectDay")}
          </Text>
        </Pressable>
        <Pressable
          onPress={goToNextDay}
          disabled={!canGoNext}
          className={`flex-1 py-2 rounded-lg items-center justify-center ${
            canGoNext ? "bg-tf-bg-secondary" : "bg-tf-bg-secondary opacity-50"
          }`}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={canGoNext ? "#C7C9E3" : "#6B6D8A"}
          />
        </Pressable>
      </View>
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={(selectedDate > todayStart ? todayStart : selectedDate).toJSDate()}
          mode="date"
          display="default"
          maximumDate={todayStart.toJSDate()}
          onChange={onDatePickerChange}
        />
      )}
      {showDatePicker && Platform.OS === "ios" && (
        <Modal transparent animationType="slide">
          <Pressable
            className="flex-1 justify-end bg-black/50"
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable
              className="bg-tf-bg-primary rounded-t-2xl p-4"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row justify-end mb-2">
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="px-4 py-2"
                >
                  <Text className="text-tf-purple font-semibold">
                    {t("done")}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={(selectedDate > todayStart ? todayStart : selectedDate).toJSDate()}
                mode="date"
                display="spinner"
                maximumDate={todayStart.toJSDate()}
                accentColor="#7C3AED"
                themeVariant="dark"
                onChange={onIOSDateChange}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
