import { Stack } from "expo-router";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function RootLayout() {
  return (
    <>
      <SignedIn>
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
        </Stack>
      </SignedIn>
      <SignedOut>
        <Redirect href="/(auth)/login" />
      </SignedOut>
    </>
  );
}
