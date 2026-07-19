import { create } from 'zustand';
import { appStorage } from '../core/storage/storage';
import { OMDB_API_KEY, TMDB_READ_ACCESS_TOKEN } from '../core/config';

const KEYS = {
  TMDB: 'openarr.tmdbToken',
  OMDB: 'openarr.omdbKey',
  REGION: 'openarr.region',
  BACKGROUND: 'openarr.backgroundStyle',
} as const;

export type BackgroundStyle = 'aurora' | 'posters';

function isPlaceholder(value: string): boolean {
  return value.startsWith('__') && value.endsWith('__');
}

function deviceRegion(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split('-').find((part) => /^[A-Z]{2}$/.test(part));
    if (region) return region;
  } catch {}
  return 'US';
}

interface SettingsState {
  // User-entered values; undefined falls back to the config.ts constants
  tmdbToken: string | undefined;
  omdbKey: string | undefined;
  region: string;
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  setTmdbToken: (token: string | undefined) => void;
  setOmdbKey: (key: string | undefined) => void;
  setRegion: (region: string) => void;
  resolvedTmdbToken: () => string | undefined;
  resolvedOmdbKey: () => string | undefined;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  tmdbToken: appStorage.getValue(KEYS.TMDB),
  omdbKey: appStorage.getValue(KEYS.OMDB),
  region: appStorage.getValue(KEYS.REGION) ?? deviceRegion(),
  backgroundStyle: (appStorage.getValue(KEYS.BACKGROUND) as BackgroundStyle) ?? 'posters',

  setBackgroundStyle: (style) => {
    appStorage.setValue(KEYS.BACKGROUND, style);
    set({ backgroundStyle: style });
  },

  setTmdbToken: (token) => {
    const trimmed = token?.trim() || undefined;
    appStorage.setValue(KEYS.TMDB, trimmed);
    set({ tmdbToken: trimmed });
  },

  setOmdbKey: (key) => {
    const trimmed = key?.trim() || undefined;
    appStorage.setValue(KEYS.OMDB, trimmed);
    set({ omdbKey: trimmed });
  },

  setRegion: (region) => {
    const value = region.trim().toUpperCase() || 'US';
    appStorage.setValue(KEYS.REGION, value);
    set({ region: value });
  },

  resolvedTmdbToken: () => {
    const user = get().tmdbToken;
    if (user) return user;
    return isPlaceholder(TMDB_READ_ACCESS_TOKEN) ? undefined : TMDB_READ_ACCESS_TOKEN;
  },

  resolvedOmdbKey: () => {
    const user = get().omdbKey;
    if (user) return user;
    return isPlaceholder(OMDB_API_KEY) ? undefined : OMDB_API_KEY;
  },
}));
