import "../global.css";
import { useEffect } from "react";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { configureApiClient } from "@acme/api-client";
import * as SecureStore from "expo-secure-store";

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60, // 1 minute
    },
  },
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
    <QueryClientProvider client={queryClient}>
      <ClerkProvider
        publishableKey={clerkPublishableKey ?? ""}
        tokenCache={tokenCache}
      >
        <ClerkLoaded>
          <ApiClientConfigurator>
            <Slot />
          </ApiClientConfigurator>
        </ClerkLoaded>
      </ClerkProvider>
    </QueryClientProvider>
  );
}
