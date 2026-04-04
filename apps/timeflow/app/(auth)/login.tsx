import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSignIn, useSSO } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { TextInput } from "@/src/components/TextInput/TextInput";
import { Button } from "@/src/components/Button/Button";
import { useTranslation } from "@/src/i18n";
import Svg, { Path } from "react-native-svg";
import { LoginBackground } from "@/src/components/LoginBackground/LoginBackground";

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

// Preloads the browser for Android devices to improve UX
// See: https://docs.expo.dev/guides/authentication/#improving-user-experience
const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  useWarmUpBrowser();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Handle email/password sign-in
  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;

    setError(null);
    setIsLoading(true);

    try {
      const signInAttempt = await signIn.create({
        strategy: "password",
        identifier: emailAddress,
        password,
      });

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(root)/(tabs)/timers");
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps (e.g., MFA).
        setError(t("signInIncomplete"));
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(
          clerkError.errors?.[0]?.message ?? t("signInError")
        );
      } else {
        setError(t("signInError"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [emailAddress, password, signIn, setActive, isLoaded, router, t]);

  // Handle Google SSO sign-in
  const onGoogleSignInPress = useCallback(async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "timeflow",
        path: "sso-callback",
      });
      const {
        createdSessionId,
        setActive: setActiveFromSSO,
        authSessionResult,
      } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      // User closed the browser before completing Google sign-in (e.g. Back, swipe)
      if (authSessionResult?.type === "dismiss") {
        return;
      }

      if (createdSessionId && setActiveFromSSO) {
        await setActiveFromSSO({ session: createdSessionId });
        router.replace("/(root)/(tabs)/timers");
      } else {
        setError(t("signInIncomplete"));
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(
          clerkError.errors?.[0]?.message ?? t("googleSignInError")
        );
      } else {
        setError(t("googleSignInError"));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [startSSOFlow, router, t]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex flex-1 w-full h-full"
    >
      <LoginBackground />
      <View
        className="flex-1 w-full px-6 py-12 justify-end"
        style={{ paddingBottom: 36 + insets.bottom }}
      >
        <Text className="text-3xl font-bold text-center mb-2 text-gray-800">
          Timeflow
        </Text>
        <Text className="text-base text-center mb-8 text-gray-600">
          {t("signInToContinue")}
        </Text>

        {error && (
          <View className="bg-red-50 p-3 rounded-lg mb-5 border border-red-200">
            <Text className="text-sm text-red-600 text-center">{error}</Text>
          </View>
        )}

        <View className="mb-6">
          <TextInput
            variant="default"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t("email")}
            value={emailAddress}
            onChangeText={setEmailAddress}
            editable={!isLoading && !isGoogleLoading}
            accessibilityLabel="Email address"
            className="mb-4"
          />

          <TextInput
            variant="default"
            secureTextEntry
            placeholder={t("password")}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading && !isGoogleLoading}
            onSubmitEditing={onSignInPress}
            accessibilityLabel="Password"
            className="mb-4"
          />

          <Button
            variant="primary"
            onPress={onSignInPress}
            disabled={!isLoaded || isLoading || isGoogleLoading}
            accessibilityLabel={t("signIn")}
            className="min-h-[52px] py-4"
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : t("signIn")}
          </Button>
        </View>

        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-4 text-sm text-gray-500 font-medium">{t("or")}</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        <Button
          variant="secondary"
          onPress={onGoogleSignInPress}
          disabled={!isLoaded || isLoading || isGoogleLoading}
          accessibilityLabel={t("signInWithGoogle")}
          className="min-h-[52px] py-4 bg-white border border-gray-300"
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#3C4043" />
          ) : (
            <View className="flex-row items-center justify-center gap-3">
              <Svg width={24} height={24} viewBox="0 0 48 48">
                <Path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <Path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <Path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <Path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </Svg>
              <Text className="text-[#3C4043] font-medium text-base">
                {t("signInWithGoogle")}
              </Text>
            </View>
          )}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
