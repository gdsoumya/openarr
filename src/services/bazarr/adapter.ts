import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { PaginatedResult } from '../../core/types/common';
import { EpisodeSubtitles, MovieSubtitles, SubtitleSearchResult, SubHistoryItem, ProviderInfo, Badges, LanguageProfile } from './types';

export class BazarrAdapter {
  readonly id = 'bazarr' as const;
  private client: AxiosInstance;

  constructor(config: ServiceConfig, isLocal: boolean) { this.client = createServiceClient(config, isLocal); }

  async testConnection(): Promise<boolean> { try { await this.client.get('/api/system/status'); return true; } catch { return false; } }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const badges = await this.getBadges();
      const wanted = badges.episodes + badges.movies;
      return { serviceId: 'bazarr', connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: wanted > 0 ? `${wanted} wanted subtitles` : 'All subtitles found',
        metric: wanted > 0 ? { value: wanted, label: 'wanted' } : undefined };
    } catch (e: any) {
      return { serviceId: 'bazarr', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getBadges(): Promise<Badges> { const { data } = await this.client.get('/api/badges'); return data.data; }
  async getEpisodeSubtitles(seriesId: number): Promise<EpisodeSubtitles[]> { const { data } = await this.client.get('/api/episodes', { params: { 'seriesid[]': seriesId } }); return data.data; }
  async searchEpisodeSubtitles(episodeId: number): Promise<SubtitleSearchResult[]> { const { data } = await this.client.get('/api/providers/episodes', { params: { episodeid: episodeId } }); return data.data; }
  async downloadEpisodeSubtitle(body: Record<string, any>): Promise<void> { await this.client.post('/api/providers/episodes', body); }
  async getMovieSubtitles(radarrId: number): Promise<MovieSubtitles> { const { data } = await this.client.get('/api/movies', { params: { 'radarrid[]': radarrId } }); return data.data[0]; }
  async searchMovieSubtitles(radarrId: number): Promise<SubtitleSearchResult[]> { const { data } = await this.client.get('/api/providers/movies', { params: { radarrid: radarrId } }); return data.data; }
  async downloadMovieSubtitle(body: Record<string, any>): Promise<void> { await this.client.post('/api/providers/movies', body); }

  async getWantedEpisodes(page = 1, pageSize = 20): Promise<PaginatedResult<EpisodeSubtitles>> {
    const { data } = await this.client.get('/api/episodes/wanted', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  async getWantedMovies(page = 1, pageSize = 20): Promise<PaginatedResult<MovieSubtitles>> {
    const { data } = await this.client.get('/api/movies/wanted', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  async getEpisodeHistory(page = 1, pageSize = 20): Promise<PaginatedResult<SubHistoryItem>> {
    const { data } = await this.client.get('/api/episodes/history', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  async getMovieHistory(page = 1, pageSize = 20): Promise<PaginatedResult<SubHistoryItem>> {
    const { data } = await this.client.get('/api/movies/history', { params: { start: (page - 1) * pageSize, length: pageSize } });
    return { page, pageSize, totalRecords: data.total, records: data.data };
  }

  async getProviders(): Promise<ProviderInfo[]> { const { data } = await this.client.get('/api/providers'); return data.data; }
  async resetProviders(): Promise<void> { await this.client.post('/api/providers'); }
  async getLanguageProfiles(): Promise<LanguageProfile[]> { const { data } = await this.client.get('/api/system/languages/profiles'); return data.data; }
}
