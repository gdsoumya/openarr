import { create } from 'zustand';

interface LibraryCacheState {
  sonarrTvdbIds: Set<number>;
  radarrTmdbIds: Set<number>;
  setSonarrIds: (ids: number[]) => void;
  setRadarrIds: (ids: number[]) => void;
  isInSonarr: (tvdbId: number) => boolean;
  isInRadarr: (tmdbId: number) => boolean;
}

export const useLibraryCache = create<LibraryCacheState>((set, get) => ({
  sonarrTvdbIds: new Set(),
  radarrTmdbIds: new Set(),
  setSonarrIds: (ids) => set({ sonarrTvdbIds: new Set(ids) }),
  setRadarrIds: (ids) => set({ radarrTmdbIds: new Set(ids) }),
  isInSonarr: (tvdbId) => get().sonarrTvdbIds.has(tvdbId),
  isInRadarr: (tmdbId) => get().radarrTmdbIds.has(tmdbId),
}));
