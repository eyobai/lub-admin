import { useSearchParams } from 'react-router-dom';

/** Filters and the page number live in the address, so a list can be bookmarked, shared and gone back to. */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>;
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);
  const set = (changes: Partial<Record<K | 'page', string>>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes) as [string, string | undefined][]) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // A new filter starts again at the first page.
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  return { values, page, set };
}

/** Undefined for an empty filter, so it is left out of the request. */
export const opt = (value: string): string | undefined => value || undefined;
