import { View, Text, ActivityIndicator } from "react-native";
import { useGetApiV1Me } from "@acme/api-client";
import { useAuth } from "@clerk/clerk-expo";
import { Button } from "@/src/components/Button/Button";

export default function ProfileScreen() {
  const { data, isLoading, error, refetch } = useGetApiV1Me();
  const { signOut } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          Error: {error.error ?? "Failed to load profile"}
        </Text>
        <Button variant="primary" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  const userId = data?.status === 200 ? data.data.userId : null;

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-3xl font-bold text-tf-text-primary mb-8">
          Profile
        </Text>
      </View>

      <View className="px-6">
        <View className="bg-tf-bg-secondary border border-tf-bg-tertiary rounded-xl p-6 mb-6">
          <Text className="text-tf-text-secondary text-sm mb-2">User ID</Text>
          <Text className="text-tf-text-primary text-base font-mono">
            {userId ?? "N/A"}
          </Text>
        </View>

        <Button variant="danger" onPress={() => signOut()} className="w-full">
          Logout
        </Button>
      </View>
    </View>
  );
}
