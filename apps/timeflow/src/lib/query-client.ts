import { QueryClient } from "@tanstack/react-query";

const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
      gcTime: ONE_MONTH_MS,
    },
  },
});
