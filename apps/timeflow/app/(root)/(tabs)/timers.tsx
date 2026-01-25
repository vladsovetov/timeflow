import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useGetApiV1Timers } from "@acme/api-client";
import { Button } from "@/src/components/Button/Button";
import { Timer } from "@/src/components/Timer/Timer";
import { useState } from "react";

export default function TimersScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGetApiV1Timers();
  const [runningTimerId, setRunningTimerId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">Loading timers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          Error: {error.error ?? "Failed to load timers"}
        </Text>
        <Button variant="primary" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  const timers = data?.status === 200 ? data.data.data : [];

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-3xl font-bold text-tf-text-primary mb-2">
          Timers
        </Text>
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
        <>
          <FlatList
            data={timers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 24, paddingTop: 8 }}
            renderItem={({ item }) => (
              <View className="mb-3">
                <Timer
                  timerType={item.timer_type}
                  color={item.color}
                  isRunning={runningTimerId === item.id}
                  onStart={() => setRunningTimerId(item.id)}
                  onPause={() => setRunningTimerId(null)}
                />
              </View>
            )}
          />
          <View className="px-6 pb-6">
            <Button
              variant="primary"
              onPress={() => router.push("/(root)/timers/create")}
              className="w-full"
            >
              Create Timer
            </Button>
          </View>
        </>
      )}
    </View>
  );
}
