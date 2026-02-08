import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "@/src/i18n";

// Complete the OAuth session when we land on this route (app opened via redirect URL).
// This allows the pending startSSOFlow() promise from the login screen to resolve.
WebBrowser.maybeCompleteAuthSession();

export default function SSOCallbackScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasRedirected.current) return;

    if (isSignedIn) {
      hasRedirected.current = true;
      router.replace("/(root)/(tabs)/timers");
      return;
    }

    // If not signed in after a short delay, session may have failed or app was cold-started.
    const timeout = setTimeout(() => {
      if (hasRedirected.current) return;
      hasRedirected.current = true;
      router.replace("/(auth)/login");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isLoaded, isSignedIn, router]);

  return (
    <View className="flex-1 bg-gray-100 justify-center items-center px-6">
      <ActivityIndicator size="large" color="#6366f1" />
      <Text className="mt-4 text-base text-gray-600 text-center">
        {t("signInToContinue")}
      </Text>
    </View>
  );
}
