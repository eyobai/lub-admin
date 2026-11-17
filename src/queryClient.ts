import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 10_000, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
}

/** Everything in the back office belongs to the signed-in staff member: nothing survives signing out. */
export const PUBLIC_QUERIES: readonly unknown[] = [];
