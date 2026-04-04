import "../global.css";
import "@/src/lib/notifications/register-notifications";
import { Slot, usePathname } from "expo-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from "@clerk/clerk-expo";
import { configureApiClient } from "@acme/api-client";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SyncProvider } from "@/src/contexts/SyncContext";
import { I18nProvider } from "@/src/i18n";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { queryClient } from "@/src/lib/query-client";
import { setSyncQueueUserId } from "@/src/lib/sync-queue";

// Complete any pending OAuth session when app opens (e.g. return from Google sign-in).
WebBrowser.maybeCompleteAuthSession();

const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30;

/** React Query + sync queue persistence scoped per Clerk user so account switches do not reuse another user's cache. */
function AuthScopedPersistQueryClient({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const persistenceKey = userId ?? "signed-out";
  const prevPersistenceKeyRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    setSyncQueueUserId(userId ?? null);
  }, [userId]);

  useLayoutEffect(() => {
    const prev = prevPersistenceKeyRef.current;
    prevPersistenceKeyRef.current = persistenceKey;
    if (prev === undefined) return;
    if (prev !== persistenceKey) {
      queryClient.clear();
    }
  }, [persistenceKey]);

  const persister = useMemo(
    () =>
      createAsyncStoragePersister({
        storage: AsyncStorage,
        key: `timeflow-react-query-${persistenceKey}`,
      }),
    [persistenceKey]
  );

  return (
    <PersistQueryClientProvider
      key={persistenceKey}
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_MONTH_MS,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

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

// Identifies the signed-in user with PostHog using common Clerk metadata
function PostHogUserIdentify({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog();
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!posthog || !isSignedIn || !user) return;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;
    const traits: Record<string, string> = {};
    const email = user.primaryEmailAddress?.emailAddress;
    if (email) traits.email = email;
    if (name) traits.name = name;
    if (user.firstName) traits.first_name = user.firstName;
    if (user.lastName) traits.last_name = user.lastName;
    if (user.createdAt) traits.created_at = String(user.createdAt);
    if (user.lastSignInAt) traits.last_sign_in_at = String(user.lastSignInAt);
    if (user.imageUrl) traits.image_url = user.imageUrl;
    posthog.identify(user.id, traits);
  }, [posthog, isSignedIn, user]);

  return <>{children}</>;
}

// Captures a PostHog screen event whenever the route changes
function PostHogScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();

  useEffect(() => {
    if (posthog && pathname) {
      posthog.screen(pathname, { $screen_name: pathname });
    }
  }, [posthog, pathname]);

  return null;
}

export default function RootLayout() {
  return (
    <PostHogProvider apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY} options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    }}>
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
          <ClerkProvider
            publishableKey={clerkPublishableKey ?? ""}
            tokenCache={tokenCache}
          >
            <I18nProvider>
              <ClerkLoaded>
                <AuthScopedPersistQueryClient>
                  <PostHogUserIdentify>
                    <PostHogScreenTracker />
                    <ApiClientConfigurator>
                      <SyncProvider>
                        <Slot />
                      </SyncProvider>
                    </ApiClientConfigurator>
                  </PostHogUserIdentify>
                </AuthScopedPersistQueryClient>
              </ClerkLoaded>
            </I18nProvider>
          </ClerkProvider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
    </PostHogProvider>
  );
}
