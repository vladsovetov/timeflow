import { Stack } from "expo-router";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { AppProvider } from "@/src/contexts/AppContext";

export default function RootLayout() {
  return (
    <>
      <SignedIn>
        <AppProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="timers/create"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Create Timer",
              headerStyle: {
                backgroundColor: "#121225",
              },
              headerTintColor: "#FFFFFF",
            }}
          />
          <Stack.Screen
            name="timers/[id]"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="timers/[id]/edit"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Edit Timer",
              headerStyle: {
                backgroundColor: "#121225",
              },
              headerTintColor: "#FFFFFF",
            }}
          />
          <Stack.Screen
            name="timers/color-picker"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Select Color",
              headerStyle: {
                backgroundColor: "#121225",
              },
              headerTintColor: "#FFFFFF",
            }}
          />
          <Stack.Screen
            name="timers/[id]/sessions"
            options={{
              presentation: "fullScreenModal",
              headerShown: true,
              title: "Timer Sessions",
              headerStyle: {
                backgroundColor: "#121225",
              },
              headerTintColor: "#FFFFFF",
            }}
          />
          <Stack.Screen
            name="timers/[id]/sessions/[sessionId]"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="timers/[id]/sessions/[sessionId]/edit"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Edit Session",
              headerStyle: {
                backgroundColor: "#121225",
              },
              headerTintColor: "#FFFFFF",
            }}
          />
          <Stack.Screen
            name="profile/edit"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Edit Profile",
              headerStyle: {
                backgroundColor: "#121225",
              },
              headerTintColor: "#FFFFFF",
            }}
          />
        </Stack>
        </AppProvider>
      </SignedIn>
      <SignedOut>
        <Redirect href="/(auth)/login" />
      </SignedOut>
    </>
  );
}
