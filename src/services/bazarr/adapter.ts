import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { PaginatedResult } from '../../core/types/common';
import {
  Badges, BlacklistItem, EpisodeSubtitles, LanguageProfile, MovieSubtitles,
  ProviderInfo, SeriesItem, SubHistoryItem, SubtitleActionParams, SubtitleInfo, SubtitleSearchResult,
} from './types';

// Bazarr's flask-restx parsers read query args, and booleans travel as "True"/"False"
const bool = (b: boolean | undefined) => (b ? 'True' : 'False');

export class BazarrAdapter {
  readonly id = 'bazarr' as const;
  private client: AxiosInstance;

  constructor(config: ServiceConfig, isLocal: boolean) { this.client = createServiceClient(config, isLocal); }

  async testConnection(): Promise<boolean> {
    // /api/system/status can hang on some Bazarr versions; use /api/system/health instead
    await this.client.get('/api/system/health');
    return true;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      // Use /api/system/health (reliable) instead of /api/badges (can hang)
      await this.client.get('/api/system/health');
      // Try to get badge counts but don't block on it
      let wanted = 0;
      try {
        const badges = await this.getBadges();
        wanted = badges.episodes + badges.movies;
      } catch {}
      return { serviceId: 'bazarr', connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: wanted > 0 ? `${wanted} wanted subtitles` : 'Connected',
        metric: wanted > 0 ? { value: wanted, label: 'wanted' } : undefined };
    } catch (e: any) {
      return { serviceId: 'bazarr', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getBadges(): Promise<Badges> { const { data } = await this.client.get('/api/badges'); return data.data; }

  async getAllSeries(): Promise<SeriesItem[]> { const { data } = await this.client.get('/api/series'); return data.data ?? []; }
  async getAllMovies(): Promise<MovieSubtitles[]> { const { data } = await this.client.get('/api/movies'); return data.data ?? []; }
  async getEpisodeSubtitles(seriesId: number): Promise<EpisodeSubtitles[]> { const { data } = await this.client.get('/api/episodes', { params: { 'seriesid[]': seriesId } }); return data.data; }
  async getMovieSubtitles(radarrId: number): Promise<MovieSubtitles> { const { data } = await this.client.get('/api/movies', { params: { 'radarrid[]': radarrId } }); return data.data[0]; }

  // --- Manual search + download (provider params travel as query args) ---

  async searchEpisodeSubtitles(episodeId: number): Promise<SubtitleSearchResult[]> {
    const { data } = await this.client.get('/api/providers/episodes', { params: { episodeid: episodeId } });
    return data.data;
  }

  async downloadEpisodeSubtitle(seriesId: number, episodeId: number, sub: SubtitleSearchResult): Promise<void> {
    await this.client.post('/api/providers/episodes', undefined, {
      params: {
        seriesid: seriesId, episodeid: episodeId, provider: sub.provider, subtitle: sub.subtitle,
        hi: sub.hearing_impaired, forced: sub.forced, original_format: sub.original_format,
      },
    });
  }

  async searchMovieSubtitles(radarrId: number): Promise<SubtitleSearchResult[]> {
    const { data } = await this.client.get('/api/providers/movies', { params: { radarrid: radarrId } });
    return data.data;
  }

  async downloadMovieSubtitle(radarrId: number, sub: SubtitleSearchResult): Promise<void> {
    await this.client.post('/api/providers/movies', undefined, {
      params: {
        radarrid: radarrId, provider: sub.provider, subtitle: sub.subtitle,
        hi: sub.hearing_impaired, forced: sub.forced, original_format: sub.original_format,
      },
    });
  }

  // --- Auto-download best match ---

  async autoDownloadEpisodeSubtitle(seriesId: number, episodeId: number, lang: SubtitleInfo): Promise<void> {
    await this.client.patch('/api/episodes/subtitles', undefined, {
      params: { seriesid: seriesId, episodeid: episodeId, language: lang.code2, forced: bool(lang.forced), hi: bool(lang.hi) },
    });
  }

  async autoDownloadMovieSubtitle(radarrId: number, lang: SubtitleInfo): Promise<void> {
    await this.client.patch('/api/movies/subtitles', undefined, {
      params: { radarrid: radarrId, language: lang.code2, forced: bool(lang.forced), hi: bool(lang.hi) },
    });
  }

  // --- Delete on disk ---

  async deleteEpisodeSubtitle(seriesId: number, episodeId: number, sub: SubtitleInfo): Promise<void> {
    await this.client.delete('/api/episodes/subtitles', {
      params: { seriesid: seriesId, episodeid: episodeId, language: sub.code2, forced: bool(sub.forced), hi: bool(sub.hi), path: sub.path },
    });
  }

  async deleteMovieSubtitle(radarrId: number, sub: SubtitleInfo): Promise<void> {
    await this.client.delete('/api/movies/subtitles', {
      params: { radarrid: radarrId, language: sub.code2, forced: bool(sub.forced), hi: bool(sub.hi), path: sub.path },
    });
  }

  // --- Per-subtitle tools (sync / translate) ---

  async subtitleAction(params: SubtitleActionParams): Promise<void> {
    await this.client.patch('/api/subtitles', undefined, {
      params: {
        action: params.action, language: params.language, path: params.path,
        type: params.type, id: params.id,
        forced: bool(params.forced), hi: bool(params.hi),
      },
    });
  }

  // --- Wanted ---

  async getWantedEpisodes(page = 1, pageSize = 20): Promise<PaginatedResult<EpisodeSubtitles>> {
    const { data } = await this.client.get('/api/episodes/wanted', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  async getWantedMovies(page = 1, pageSize = 20): Promise<PaginatedResult<MovieSubtitles>> {
    const { data } = await this.client.get('/api/movies/wanted', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  // --- History ---

  async getEpisodeHistory(page = 1, pageSize = 20): Promise<PaginatedResult<SubHistoryItem>> {
    const { data } = await this.client.get('/api/episodes/history', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  async getMovieHistory(page = 1, pageSize = 20): Promise<PaginatedResult<SubHistoryItem>> {
    const { data } = await this.client.get('/api/movies/history', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  // --- Blacklist ---

  async getEpisodeBlacklist(page = 1, pageSize = 50): Promise<BlacklistItem[]> {
    const { data } = await this.client.get('/api/episodes/blacklist', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return data.data ?? [];
  }

  async getMovieBlacklist(page = 1, pageSize = 50): Promise<BlacklistItem[]> {
    const { data } = await this.client.get('/api/movies/blacklist', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return data.data ?? [];
  }

  async blacklistEpisodeSubtitle(item: { seriesid: number; episodeid: number; provider: string; subs_id: string; language: string; subtitles_path: string }): Promise<void> {
    await this.client.post('/api/episodes/blacklist', undefined, { params: item });
  }

  async blacklistMovieSubtitle(item: { radarrid: number; provider: string; subs_id: string; language: string; subtitles_path: string }): Promise<void> {
    await this.client.post('/api/movies/blacklist', undefined, { params: item });
  }

  async removeFromEpisodeBlacklist(provider: string, subsId: string): Promise<void> {
    await this.client.delete('/api/episodes/blacklist', { params: { provider, subs_id: subsId } });
  }

  async removeFromMovieBlacklist(provider: string, subsId: string): Promise<void> {
    await this.client.delete('/api/movies/blacklist', { params: { provider, subs_id: subsId } });
  }

  // --- System ---

  async runTask(taskid: string): Promise<void> {
    await this.client.post('/api/system/tasks', undefined, { params: { taskid } });
  }

  async searchAllWanted(): Promise<void> {
    await this.runTask('wanted_search_missing_subtitles_series');
    await this.runTask('wanted_search_missing_subtitles_movies');
  }

  async getProviders(): Promise<ProviderInfo[]> { const { data } = await this.client.get('/api/providers'); return data.data; }
  async resetProviders(): Promise<void> { await this.client.post('/api/providers'); }
  async getLanguageProfiles(): Promise<LanguageProfile[]> { const { data } = await this.client.get('/api/system/languages/profiles'); return data.data; }
}
