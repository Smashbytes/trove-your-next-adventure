import { QueryClient } from "@tanstack/react-query";

// Single shared client for the app. Sensible defaults for a mobile marketplace:
// data is fresh for 30s, retries once, and we don't refetch aggressively on
// window focus (the feed doesn't change second-to-second).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
