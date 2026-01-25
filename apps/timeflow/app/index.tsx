import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function Index() {
  return (
    <>
      <SignedIn>
        <Redirect href="/(root)/(tabs)/timers" />
      </SignedIn>
      <SignedOut>
        <Redirect href="/(auth)/login" />
      </SignedOut>
    </>
  );
}
