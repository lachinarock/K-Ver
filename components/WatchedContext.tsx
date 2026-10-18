import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { listWatched, removeWatched, saveWatched } from '@/lib/watched';
import { titleKey, type MediaType, type WatchedTitle } from '@/lib/types';

type WatchedContextValue = {
  items: WatchedTitle[];
  ready: boolean;
  ratingFor: (mediaType: MediaType, tmdbId: number) => number | null;
  save: (input: Omit<WatchedTitle, 'updatedAt'>) => Promise<void>;
  remove: (mediaType: MediaType, tmdbId: number) => Promise<void>;
};

const WatchedContext = createContext<WatchedContextValue | null>(null);

export function WatchedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchedTitle[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const next = await listWatched();
    setItems(next);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => setReady(true));
  }, [refresh]);

  const value = useMemo<WatchedContextValue>(
    () => ({
      items,
      ready,
      ratingFor: (mediaType, tmdbId) =>
        items.find((item) => titleKey(item.mediaType, item.tmdbId) === titleKey(mediaType, tmdbId))
          ?.rating ?? null,
      save: async (input) => {
        await saveWatched(input);
        await refresh();
      },
      remove: async (mediaType, tmdbId) => {
        await removeWatched(mediaType, tmdbId);
        await refresh();
      },
    }),
    [items, ready, refresh],
  );

  return <WatchedContext.Provider value={value}>{children}</WatchedContext.Provider>;
}

export function useWatched() {
  const value = useContext(WatchedContext);
  if (!value) throw new Error('useWatched debe usarse dentro de WatchedProvider');
  return value;
}
