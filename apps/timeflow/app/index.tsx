import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from "react-native";
import { useAuth, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { useGetApiV1Me, useGetApiV1ExampleDb } from "@acme/api-client";
import { Redirect } from "expo-router";

function UserInfo() {
  const { data: response, isLoading, error, refetch } = useGetApiV1Me();
  const { data: exampleDbData, isLoading: isExampleDbLoading, error: exampleDbError, refetch: refetchExampleDb } = useGetApiV1ExampleDb();
  console.log("exampleDbData", exampleDbData);
  console.log("isExampleDbLoading", isExampleDbLoading);
  console.log("exampleDbError", exampleDbError);
  console.log("refetchExampleDb", refetchExampleDb);
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading user info...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Error: {error.error ?? "Unknown error"}
        </Text>
        <View style={styles.buttonContainer}>
          <Button title="Retry" onPress={() => refetch()} />
        </View>
      </View>
    );
  }

  // Check for successful response (status 200)
  if (response?.status === 200) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successText}>Authenticated!</Text>
        <View style={styles.infoBox}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{response.data.userId}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Refresh" onPress={() => refetch()} />
        </View>
      </View>
    );
  }

  // Handle 401 or other errors
  if (response?.status === 401) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Unauthorized: {response.data.error}
        </Text>
        <View style={styles.buttonContainer}>
          <Button title="Retry" onPress={() => refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.infoText}>Loading...</Text>
    </View>
  );
}

function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <View style={styles.buttonContainer}>
      <Button title="Sign Out" onPress={() => signOut()} color="#cc0000" />
    </View>
  );
}

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timeflow</Text>

      <SignedIn>
        <UserInfo />
        <SignOutButton />
      </SignedIn>

      <SignedOut>
        <Redirect href="/login" />
      </SignedOut>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 32,
    color: "#333",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#cc0000",
    textAlign: "center",
    marginBottom: 16,
  },
  successText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#00aa00",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    fontFamily: "monospace",
  },
  infoText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 16,
    width: "100%",
    maxWidth: 200,
  },
});
