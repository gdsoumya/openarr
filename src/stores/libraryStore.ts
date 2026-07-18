import { create } from 'zustand';
import { appStorage } from '../core/storage/storage';
import { Movie } from '../services/radarr/types';
import { Series } from '../services/sonarr/types';
import { tmdb } from '../services/tmdb/instance';

const ID_MAP_KEY = 'openarr.idMap.tvdbToTmdb';

export interface LibraryEntry {
  arrId: number;
  tmdbId: number;
  tvdbId?: number;
  title: string;
  monitored: boolean;
  hasFile?: boolean;
  percentOfEpisodes?: number;
  downloadProgress?: number;
}

export type LibraryBadge = { label: string; variant: 'downloading' | 'completed' | 'missing' | 'monitored' | 'inLibrary' };

interface LibraryState {
  movies: Map<number, LibraryEntry>;  // keyed by tmdbId
  shows: Map<number, LibraryEntry>;   // keyed by tmdbId
  setMovies: (movies: Movie[], progressByArrId?: Map<number, number>) => void;
  setShows: (series: Series[], progressByArrId?: Map<number, number>) => Promise<void>;
  getEntry: (type: 'movie' | 'tv', tmdbId: number | undefined) => LibraryEntry | undefined;
  getBadge: (type: 'movie' | 'tv', tmdbId: number | undefined) => LibraryBadge | undefined;
}

// tvdb→tmdb resolutions persist so each show costs at most one /find call ever
function loadIdMap(): Record<string, number> {
  return appStorage.getJSON<Record<string, number>>(ID_MAP_KEY) ?? {};
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  movies: new Map(),
  shows: new Map(),

  setMovies: (movies, progressByArrId) => {
    const map = new Map<number, LibraryEntry>();
    for (const m of movies) {
      if (!m.tmdbId) continue;
      map.set(m.tmdbId, {
        arrId: m.id, tmdbId: m.tmdbId, title: m.title, monitored: m.monitored,
        hasFile: m.hasFile, downloadProgress: progressByArrId?.get(m.id),
      });
    }
    set({ movies: map });
  },

  setShows: async (series, progressByArrId) => {
    const idMap = loadIdMap();
    let idMapDirty = false;
    const map = new Map<number, LibraryEntry>();
    const unresolved: Series[] = [];

    for (const s of series) {
      const tmdbId = s.tmdbId ?? idMap[String(s.tvdbId)];
      if (tmdbId) {
        map.set(tmdbId, {
          arrId: s.id, tmdbId, tvdbId: s.tvdbId, title: s.title, monitored: s.monitored,
          percentOfEpisodes: s.statistics?.percentOfEpisodes,
          hasFile: (s.statistics?.episodeFileCount ?? 0) > 0,
          downloadProgress: progressByArrId?.get(s.id),
        });
      } else if (s.tvdbId) {
        unresolved.push(s);
      }
    }
    // Publish what we have immediately; resolve stragglers via /find
    set({ shows: map });

    for (const s of unresolved) {
      try {
        const found = await tmdb.findByExternalId(String(s.tvdbId), 'tvdb_id');
        const tmdbId = found.tv_results[0]?.id;
        if (!tmdbId) continue;
        idMap[String(s.tvdbId)] = tmdbId;
        idMapDirty = true;
        map.set(tmdbId, {
          arrId: s.id, tmdbId, tvdbId: s.tvdbId, title: s.title, monitored: s.monitored,
          percentOfEpisodes: s.statistics?.percentOfEpisodes,
          hasFile: (s.statistics?.episodeFileCount ?? 0) > 0,
          downloadProgress: progressByArrId?.get(s.id),
        });
      } catch {
        // TMDB unreachable/unconfigured — badges degrade gracefully
      }
    }
    if (idMapDirty) appStorage.setJSON(ID_MAP_KEY, idMap);
    if (unresolved.length) set({ shows: new Map(map) });
  },

  getEntry: (type, tmdbId) => {
    if (!tmdbId) return undefined;
    return type === 'movie' ? get().movies.get(tmdbId) : get().shows.get(tmdbId);
  },

  getBadge: (type, tmdbId) => {
    const entry = get().getEntry(type, tmdbId);
    if (!entry) return undefined;
    if (entry.downloadProgress !== undefined) return { label: `↓ ${Math.round(entry.downloadProgress)}%`, variant: 'downloading' };
    if (type === 'movie') {
      if (entry.hasFile) return { label: 'In Library', variant: 'inLibrary' };
      return { label: 'Missing', variant: 'missing' };
    }
    if (entry.percentOfEpisodes === 100) return { label: '✓ All', variant: 'completed' };
    return { label: 'In Library', variant: 'inLibrary' };
  },
}));
