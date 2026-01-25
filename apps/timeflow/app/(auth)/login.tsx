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
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { TextInput } from "@/src/components/TextInput/TextInput";
import { Button } from "@/src/components/Button/Button";

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
        setError("Sign-in incomplete. Additional steps may be required.");
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(
          clerkError.errors?.[0]?.message ?? "An error occurred during sign-in."
        );
      } else {
        setError("An error occurred during sign-in.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [emailAddress, password, signIn, setActive, isLoaded, router]);

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
        setError("Sign-in incomplete. Additional steps may be required.");
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const clerkError = err as { errors: Array<{ message: string }> };
        setError(
          clerkError.errors?.[0]?.message ??
            "An error occurred during Google sign-in."
        );
      } else {
        setError("An error occurred during Google sign-in.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-100"
    >
      <View className="flex-1 px-6 pt-16 justify-center">
        <Text className="text-3xl font-bold text-center mb-2 text-gray-800">
          Timeflow
        </Text>
        <Text className="text-base text-center mb-8 text-gray-600">
          Sign in to continue
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
            placeholder="Email"
            value={emailAddress}
            onChangeText={setEmailAddress}
            editable={!isLoading && !isGoogleLoading}
            accessibilityLabel="Email address"
            className="mb-4"
          />

          <TextInput
            variant="default"
            secureTextEntry
            placeholder="Password"
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
            accessibilityLabel="Sign in"
            className="min-h-[52px] py-4"
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : "Sign In"}
          </Button>
        </View>

        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-4 text-sm text-gray-500 font-medium">OR</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        <Button
          variant="secondary"
          onPress={onGoogleSignInPress}
          disabled={!isLoaded || isLoading || isGoogleLoading}
          accessibilityLabel="Sign in with Google"
          className="min-h-[52px] py-4 bg-white border border-gray-300"
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#3C4043" />
          ) : (
            <View className="flex-row items-center justify-center gap-3">
              <MaterialCommunityIcons
                name="google"
                size={20}
                color="#4285F4"
              />
              <Text className="text-[#3C4043] font-medium text-base">
                Sign in with Google
              </Text>
            </View>
          )}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
