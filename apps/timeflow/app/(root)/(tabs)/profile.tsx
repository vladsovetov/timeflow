import { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useGetApiV1Me } from "@acme/api-client";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/Button/Button";
import { useTranslation } from "@/src/i18n";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useGetApiV1Me();
  const { signOut } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">{t("loadingProfile")}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          {t("error")}: {error.error ?? t("loadProfileError")}
        </Text>
        <Button variant="primary" onPress={() => refetch()}>
          {t("retry")}
        </Button>
      </View>
    );
  }

  const profile = data?.status === 200 ? data.data : null;
  const userId = profile?.userId ?? null;

  return (
    <ScrollView
      className="flex-1 bg-tf-bg-primary"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
      }
    >
      <View className="px-6 pt-16 pb-4">
        <Text className="text-3xl font-bold text-tf-text-primary mb-8">
          {t("profile")}
        </Text>
      </View>

      <View className="px-6">
        <View className="bg-tf-bg-secondary border border-tf-bg-tertiary rounded-xl p-6 mb-4">
          <Text className="text-tf-text-secondary text-sm mb-2">{t("userId")}</Text>
          <Text className="text-tf-text-primary text-base font-mono">
            {userId ?? t("na")}
          </Text>
        </View>

        {(profile?.first_name || profile?.last_name || profile?.timezone) && (
          <View className="bg-tf-bg-secondary border border-tf-bg-tertiary rounded-xl p-6 mb-4">
            {profile.first_name && (
              <View className="mb-4">
                <Text className="text-tf-text-secondary text-sm mb-2">{t("firstName")}</Text>
                <Text className="text-tf-text-primary text-base">
                  {profile.first_name}
                </Text>
              </View>
            )}
            {profile.last_name && (
              <View className="mb-4">
                <Text className="text-tf-text-secondary text-sm mb-2">{t("lastName")}</Text>
                <Text className="text-tf-text-primary text-base">
                  {profile.last_name}
                </Text>
              </View>
            )}
            {profile.timezone && (
              <View>
                <Text className="text-tf-text-secondary text-sm mb-2">{t("timezone")}</Text>
                <Text className="text-tf-text-primary text-base">
                  {profile.timezone}
                </Text>
              </View>
            )}
          </View>
        )}

        <Button
          variant="primary"
          onPress={() => router.push("/(root)/profile/edit")}
          className="w-full mb-4"
        >
          {t("editProfile")}
        </Button>

        <Button variant="danger" onPress={() => signOut()} className="w-full">
          {t("logout")}
        </Button>
      </View>
    </ScrollView>
  );
}
