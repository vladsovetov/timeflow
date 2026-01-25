import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useGetApiV1Timers } from "@acme/api-client";
import { Button } from "@/src/components/Button/Button";

export default function TimersScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGetApiV1Timers();

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
              <TouchableOpacity
                onPress={() => router.push(`/(root)/timers/${item.id}`)}
                className="bg-tf-bg-secondary border border-tf-bg-tertiary rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-center">
                  {item.color && (
                    <View
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <View className="flex-1">
                    <Text className="text-tf-text-primary text-lg font-semibold">
                      {item.name}
                    </Text>
                    <Text className="text-tf-text-secondary text-sm mt-1">
                      {item.timer_type}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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
