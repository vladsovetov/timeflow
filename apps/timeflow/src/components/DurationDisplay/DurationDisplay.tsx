import { Text, View } from "react-native";
import { formatDurationParts } from "@/src/lib/date";

type DurationDisplayProps = {
  seconds: number;
  className?: string;
  /** Use larger text (e.g. for main timer on card). Default: base size. */
  size?: "sm" | "base" | "lg";
};

const sizeClasses = {
  sm: { main: "text-sm", seconds: "text-xs" },
  base: { main: "text-base", seconds: "text-xs" },
  lg: { main: "text-2xl", seconds: "text-base" },
};

export function DurationDisplay({
  seconds,
  className = "",
  size = "base",
}: DurationDisplayProps) {
  const { main, seconds: secondsPart } = formatDurationParts(seconds);
  const classes = sizeClasses[size];

  return (
    <View className={`flex-row items-baseline ${className}`}>
      <Text className={`font-mono font-semibold text-tf-text-primary ${classes.main}`}>
        {main}
      </Text>
      <Text className={`font-mono text-tf-text-secondary ${classes.seconds}`}>
        {secondsPart}
      </Text>
    </View>
  );
}
