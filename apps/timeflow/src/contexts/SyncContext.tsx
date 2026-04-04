import { useEffect } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import type { NetworkStateEvent } from "expo-network";
import { useQueryClient } from "@tanstack/react-query";
import { syncQueue } from "@/src/lib/sync-queue";
import { isTimerSessionOp } from "@/src/lib/sync-queue-timer-sessions";
import { isTimersProfileOp } from "@/src/lib/sync-queue-timers-profile";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    syncQueue.setOnProcessed((op) => {
      if (isTimerSessionOp(op)) {
        queryClient.invalidateQueries({ queryKey: ["/api/v1/timers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/v1/timer-sessions"] });
      }
      if (isTimersProfileOp(op)) {
        queryClient.invalidateQueries({ queryKey: ["/api/v1/timers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/v1/me"] });
      }
    });
    return () => syncQueue.setOnProcessed(undefined);
  }, [queryClient]);

  useEffect(() => {
    const process = () => syncQueue.process();
    void process();
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
