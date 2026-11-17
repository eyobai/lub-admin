import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../api/client';
import type { components } from '../api/schema';

export type Schemas = components['schemas'];

/** Every back-office query starts with this key, so one action can refresh whatever it may have changed. */
export const ADMIN = 'admin';

export const PAGE_SIZE = 20;

/** After an action: everything shown may have changed (statuses, balances, counts), so all of it is asked again. */
export function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ADMIN] });
}

/** A page of a list, keeping the previous page on screen while the next one loads. */
export function useList<T>(key: unknown[], load: () => Promise<T>, enabled = true) {
  return useQuery({ queryKey: [ADMIN, ...key], queryFn: load, placeholderData: keepPreviousData, enabled });
}

export function useOne<T>(key: unknown[], load: () => Promise<T>, enabled = true) {
  return useQuery({ queryKey: [ADMIN, ...key], queryFn: load, enabled });
}

export { api, unwrap };
