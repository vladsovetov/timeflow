import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetApiV1Timers,
  usePatchApiV1TimersReorder,
  getGetApiV1TimersQueryKey,
} from "@acme/api-client";
import { Button } from "@/src/components/Button/Button";
import { Timer } from "@/src/components/Timer/Timer";
import type { Timer as TimerModel } from "@acme/api-client";

export default function TimersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useGetApiV1Timers();
  const reorderMutation = usePatchApiV1TimersReorder();

  const timersFromApi = data?.status === 200 ? data.data.data : [];
  const [timers, setTimers] = useState<TimerModel[]>([]);

  useEffect(() => {
    setTimers(timersFromApi);
  }, [data]);

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

  async function handleDragEnd({ data: newData }: { data: TimerModel[] }) {
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

  function renderItem({ item, drag, isActive }: RenderItemParams<TimerModel>) {
    return (
      <ScaleDecorator>
        <View className="flex-row items-center mb-3">
          <Pressable
            onLongPress={drag}
            disabled={isActive}
            className="mr-2 py-4 px-1 justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="reorder-three"
              size={24}
              color="#6B7280"
            />
          </Pressable>
          <View className="flex-1">
            <Timer timer={item} onStart={() => {}} onPause={() => {}} />
          </View>
        </View>
      </ScaleDecorator>
    );
  }

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
        <View className="flex-1 justify-between">
          <DraggableFlatList
            data={timers}
            keyExtractor={(item: TimerModel) => item.id}
            onDragEnd={handleDragEnd}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 24, paddingTop: 8 }}
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
        </View>
      )}
    </View>
  );
}
