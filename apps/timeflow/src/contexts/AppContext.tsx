import { createContext, useContext } from "react";
import { useGetApiV1Me } from "@acme/api-client";
import type { MeResponse } from "@acme/api-client";
import { getDeviceTimezone } from "@/src/lib/date";

type AppContextValue = {
  profile: MeResponse | null;
  timezone: string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data } = useGetApiV1Me();
  const profile = data?.status === 200 ? data.data : null;
  const timezone = profile?.timezone ?? getDeviceTimezone();

  const value: AppContextValue = {
    profile,
    timezone,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return {
      profile: null,
      timezone: getDeviceTimezone(),
    };
  }
  return ctx;
}

export function useProfile(): MeResponse | null {
  return useAppContext().profile;
}

export function useUserTimezone(): string {
  return useAppContext().timezone;
}
