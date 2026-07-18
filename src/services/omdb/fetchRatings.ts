import { OMDBClient, OMDBRatings } from './client';
import { tmdb } from '../tmdb/instance';
import { useSettingsStore } from '../../stores/settingsStore';

function getOmdb(): OMDBClient | null {
  const key = useSettingsStore.getState().resolvedOmdbKey();
  return key ? new OMDBClient(key) : null;
}

/**
 * Fetches OMDB ratings using the best available identifier.
 * Priority: imdbId → TMDB external IDs → title search
 */
export async function fetchOMDBRatings(params: {
  imdbId?: string;
  tmdbId?: number;
  title?: string;
  year?: number;
  type?: 'tv' | 'movie';
}): Promise<OMDBRatings | null> {
  const omdb = getOmdb();
  if (!omdb) return null;
  const { imdbId, tmdbId, title, year, type } = params;

  // 1. Try direct IMDB ID
  if (imdbId) {
    const result = await omdb.getByImdbId(imdbId);
    if (result) return result;
  }

  // 2. Get IMDB ID from TMDB
  if (tmdbId) {
    try {
      let fetchedImdbId: string | undefined;
      if (type === 'tv') {
        const ids = await tmdb.getShowExternalIds(tmdbId);
        fetchedImdbId = ids.imdb_id;
      } else {
        // Movie details include imdb_id
        const details = await tmdb.getMovieDetails(tmdbId);
        fetchedImdbId = (details as any).imdb_id;
      }
      if (fetchedImdbId) {
        const result = await omdb.getByImdbId(fetchedImdbId);
        if (result) return result;
      }
    } catch {}
  }

  // 3. Fallback to title search
  if (title) {
    const result = await omdb.getByTitle(title, year ? String(year) : undefined);
    if (result) return result;
  }

  return null;
}
