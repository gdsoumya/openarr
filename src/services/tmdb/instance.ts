import { TMDBClient } from './client';
import { useSettingsStore } from '../../stores/settingsStore';

// Single shared client; the token can come from Settings (MMKV) or the
// build-time constant in core/config.ts. Rebuilt whenever Settings changes.
export const tmdb = new TMDBClient(useSettingsStore.getState().resolvedTmdbToken() ?? '');

useSettingsStore.subscribe((state, prev) => {
  if (state.tmdbToken !== prev.tmdbToken) {
    tmdb.setToken(state.resolvedTmdbToken() ?? '');
  }
});

export function isTmdbConfigured(): boolean {
  return !!useSettingsStore.getState().resolvedTmdbToken();
}
