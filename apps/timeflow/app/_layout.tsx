import "../global.css";
import { Slot } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { configureApiClient } from "@acme/api-client";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SyncProvider } from "@/src/contexts/SyncContext";
import { I18nProvider } from "@/src/i18n";
import { PostHogProvider } from 'posthog-react-native'

// Complete any pending OAuth session when app opens (e.g. return from Google sign-in).
WebBrowser.maybeCompleteAuthSession();

const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60, // 1 minute
      gcTime: ONE_MONTH_MS,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// Token cache for Clerk using SecureStore
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore errors
    }
  },
};

// Get Clerk publishable key from environment
// ENV: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY - Your Clerk publishable key
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.warn(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Auth will not work."
  );
}

// Component that configures the API client once auth is ready
function ApiClientConfigurator({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  // ENV: EXPO_PUBLIC_API_URL - The base URL of your API (e.g., https://your-app.vercel.app)
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

  configureApiClient({
    baseUrl,
    getToken: async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    },
  });

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY} options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    }}>
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: ONE_MONTH_MS,
          }}
        >
          <ClerkProvider
            publishableKey={clerkPublishableKey ?? ""}
            tokenCache={tokenCache}
          >
            <I18nProvider>
              <ClerkLoaded>
                <ApiClientConfigurator>
                  <SyncProvider>
                    <Slot />
                  </SyncProvider>
                </ApiClientConfigurator>
              </ClerkLoaded>
            </I18nProvider>
          </ClerkProvider>
        </PersistQueryClientProvider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
    </PostHogProvider>
  );
}
