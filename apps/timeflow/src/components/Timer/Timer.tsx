import { View, Text, TouchableOpacity } from "react-native";

interface TimerProps {
  onStart?: () => void;
  onPause?: () => void;
  isRunning?: boolean;
}

export function Timer({ onStart, onPause, isRunning = false }: TimerProps) {
  return (
    <View className="w-[200] h-[200] rounded-full bg-tf-bg-secondary border-2 border-tf-bg-tertiary items-center justify-center">
      {isRunning ? (
        <TouchableOpacity
          onPress={onPause}
          className="w-16 h-16 rounded-full bg-tf-error items-center justify-center"
        >
          <Text className="text-white text-lg font-bold">⏸</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onStart}
          className="w-16 h-16 rounded-full bg-tf-success items-center justify-center"
        >
          <Text className="text-white text-lg font-bold">▶</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
