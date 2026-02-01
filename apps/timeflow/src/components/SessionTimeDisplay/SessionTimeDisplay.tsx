import { View, Text } from "react-native";

type SessionTimeDisplayProps = {
  currentIso: string;
  originalIso: string | null;
  formatDateFn: (iso: string) => string;
  label?: string;
  className?: string;
};

export function SessionTimeDisplay({
  currentIso,
  originalIso,
  formatDateFn,
  label,
  className = "",
}: SessionTimeDisplayProps) {
  const currentLabel = formatDateFn(currentIso);
  const showOriginal =
    originalIso != null && originalIso !== currentIso;
  const originalLabel = showOriginal ? formatDateFn(originalIso) : null;

  return (
    <View className={className}>
      {label ? (
        <Text className="text-tf-text-secondary text-xs mb-0.5">{label}</Text>
      ) : null}
      <Text className="text-tf-text-primary text-base">{currentLabel}</Text>
      {originalLabel ? (
        <Text className="text-tf-text-secondary text-xs line-through mt-0.5">
          {originalLabel}
        </Text>
      ) : null}
    </View>
  );
}
