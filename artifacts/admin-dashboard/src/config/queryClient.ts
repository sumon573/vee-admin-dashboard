import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client.
 *
 * Defaults:
 *  - staleTime: 60 s   — data is considered fresh for 60 seconds
 *  - gcTime:    5 min  — unused cache entries are garbage-collected after 5 minutes
 *  - retry: 1          — failed requests are retried once before surfacing an error
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
