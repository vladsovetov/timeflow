import { useEffect } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import type { NetworkStateEvent } from "expo-network";
import { useQueryClient } from "@tanstack/react-query";
import { syncQueue } from "@/src/lib/sync-queue";
import { isTimerSessionOp } from "@/src/lib/sync-queue-timer-sessions";
import { getGetApiV1TimersQueryKey } from "@acme/api-client";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    syncQueue.setOnProcessed((op) => {
      if (isTimerSessionOp(op)) {
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
      }
    });
    return () => syncQueue.setOnProcessed(undefined);
  }, [queryClient]);

  useEffect(() => {
    const process = () => syncQueue.process();
    const appSub = AppState.addEventListener("change", (status) => {
      if (status === "active") process();
    });
    const netSub = Network.addNetworkStateListener((state: NetworkStateEvent) => {
      if (state.isConnected) process();
    });
    return () => {
      appSub.remove();
      netSub.remove();
    };
  }, []);

  return <>{children}</>;
}
