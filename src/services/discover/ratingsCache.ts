import { appStorage } from '../../core/storage/storage';
import { fetchOMDBRatings } from '../omdb/fetchRatings';
import { useSettingsStore } from '../../stores/settingsStore';

const CACHE_KEY = 'openarr.externalRatings';

export interface ExternalRatings { imdb?: number; rt?: number; }

type CacheMap = Record<string, ExternalRatings>;

let cache: CacheMap | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function load(): CacheMap {
  if (!cache) cache = appStorage.getJSON<CacheMap>(CACHE_KEY) ?? {};
  return cache;
}

// Batch MMKV writes, the map grows unbounded and serializing it per lookup
// would cost time proportional to historical usage
const MAX_ENTRIES = 2000;

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (!cache) return;
    // Bound the map: drop the oldest (insertion-ordered) half once over cap
    const keys = Object.keys(cache);
    if (keys.length > MAX_ENTRIES) {
      for (const k of keys.slice(0, keys.length - MAX_ENTRIES / 2)) delete cache[k];
    }
    appStorage.setJSON(CACHE_KEY, cache);
  }, 1000);
}

export function getCachedRatings(type: 'movie' | 'tv', tmdbId: number): ExternalRatings | undefined {
  return load()[`${type}:${tmdbId}`];
}

// Resolves IMDB/RT scores via OMDB (one lookup per title ever, persisted).
// Genuine not-found results cache an empty record; "no OMDB key" and network
// errors are NOT cached so adding a key later works retroactively.
export async function fetchExternalRatings(
  type: 'movie' | 'tv',
  tmdbId: number,
  title?: string,
): Promise<ExternalRatings> {
  const cached = getCachedRatings(type, tmdbId);
  if (cached) return cached;
  if (!useSettingsStore.getState().resolvedOmdbKey()) return {};

  try {
    const omdb = await fetchOMDBRatings({ tmdbId, title, type });
    const imdb = omdb ? parseFloat(omdb.imdbRating) : NaN;
    const rt = omdb?.rottenTomatoesCritic ? parseInt(omdb.rottenTomatoesCritic, 10) : NaN;
    const ratings: ExternalRatings = {
      ...(Number.isFinite(imdb) ? { imdb } : {}),
      ...(Number.isFinite(rt) ? { rt } : {}),
    };
    load()[`${type}:${tmdbId}`] = ratings;
    scheduleFlush();
    return ratings;
  } catch {
    return {};
  }
}
