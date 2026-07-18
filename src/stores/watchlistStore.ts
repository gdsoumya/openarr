import { create } from 'zustand';
import { appStorage } from '../core/storage/storage';

const KEY = 'openarr.watchlist';

export interface WatchlistItem {
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  genreIds: number[];
  addedAt: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  add: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  remove: (tmdbId: number, type: 'movie' | 'tv') => void;
  toggle: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  has: (tmdbId: number, type: 'movie' | 'tv') => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: appStorage.getJSON<WatchlistItem[]>(KEY) ?? [],

  add: (item) => {
    if (get().has(item.tmdbId, item.type)) return;
    const items = [{ ...item, addedAt: Date.now() }, ...get().items];
    appStorage.setJSON(KEY, items);
    set({ items });
  },

  remove: (tmdbId, type) => {
    const items = get().items.filter((i) => !(i.tmdbId === tmdbId && i.type === type));
    appStorage.setJSON(KEY, items);
    set({ items });
  },

  toggle: (item) => {
    if (get().has(item.tmdbId, item.type)) get().remove(item.tmdbId, item.type);
    else get().add(item);
  },

  has: (tmdbId, type) => get().items.some((i) => i.tmdbId === tmdbId && i.type === type),
}));
