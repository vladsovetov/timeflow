import { View, Text, TouchableOpacity } from "react-native";
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

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
  timerType?: string;
  color?: string | null;
  onStart?: () => void;
  onPause?: () => void;
  isRunning?: boolean;
  initialTime?: number; // in seconds
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
  timerType = "other",
  color,
  onStart,
  onPause,
  isRunning = false,
  initialTime = 0,
}: TimerProps) {
  const [time, setTime] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
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
    setTime(initialTime);
  }, [initialTime]);

  const iconName = TIMER_TYPE_ICONS[timerType] || TIMER_TYPE_ICONS.other;
  const borderColor = color || "#6B7280";

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
            onPress={onPause}
            className="w-12 h-12 rounded-full bg-tf-error items-center justify-center"
          >
            <Ionicons name="pause" size={24} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onStart}
            className="w-12 h-12 rounded-full bg-tf-success items-center justify-center"
          >
            <Ionicons name="play" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
