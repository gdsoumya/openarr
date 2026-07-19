import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';

export interface EmbyItemRef { Id: string; ServerId: string; Name: string; }

export interface EmbyMediaItem {
  Id: string;
  ServerId: string;
  Name: string;
  Type: 'Movie' | 'Episode' | 'Series';
  SeriesId?: string;
  SeriesName?: string;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  ImageTags?: { Primary?: string };
  SeriesPrimaryImageTag?: string;
  ProductionYear?: number;
  UserData?: { PlayedPercentage?: number; Played?: boolean };
}

export class EmbyAdapter {
  readonly id = 'emby' as const;
  private client: AxiosInstance;
  readonly baseUrl: string;
  private apiKey: string;
  private userId: string | null = null;

  constructor(config: ServiceConfig, isLocal: boolean) {
    this.client = createServiceClient(config, isLocal);
    this.baseUrl = (isLocal ? config.localUrl : config.remoteUrl).replace(/\/+$/, '');
    this.apiKey = config.apiKey ?? '';
  }

  // Watched state is per-user; use the first server user (single-user setups)
  private async getUserId(): Promise<string | null> {
    if (this.userId) return this.userId;
    const { data } = await this.client.get('/Users');
    this.userId = data?.[0]?.Id ?? null;
    return this.userId;
  }

  async getResumeItems(limit = 12): Promise<EmbyMediaItem[]> {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data } = await this.client.get(`/Users/${userId}/Items/Resume`, {
      params: { Limit: limit, MediaTypes: 'Video' },
    });
    return data.Items ?? [];
  }

  async getNextUp(limit = 12): Promise<EmbyMediaItem[]> {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data } = await this.client.get('/Shows/NextUp', { params: { UserId: userId, Limit: limit } });
    return data.Items ?? [];
  }

  async getLatestUnplayedMovies(limit = 12): Promise<EmbyMediaItem[]> {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data } = await this.client.get(`/Users/${userId}/Items/Latest`, {
      params: { Limit: limit, IncludeItemTypes: 'Movie', IsPlayed: false },
    });
    return Array.isArray(data) ? data : data.Items ?? [];
  }

  // Episodes use their series poster; api_key travels as a param since image
  // requests bypass the axios client
  posterUrl(item: EmbyMediaItem): string | undefined {
    const imageItemId = item.Type === 'Episode' && item.SeriesId ? item.SeriesId : item.Id;
    const tag = item.Type === 'Episode' && item.SeriesId ? item.SeriesPrimaryImageTag : item.ImageTags?.Primary;
    if (!tag) return undefined;
    return `${this.baseUrl}/emby/Items/${imageItemId}/Images/Primary?maxHeight=450&tag=${tag}&api_key=${this.apiKey}`;
  }

  async testConnection(): Promise<boolean> {
    await this.client.get('/System/Info');
    return true;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const { data } = await this.client.get('/System/Info');
      return {
        serviceId: 'emby',
        connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: data.ServerName ? `${data.ServerName} · v${data.Version}` : 'Connected',
      };
    } catch (e: any) {
      return { serviceId: 'emby', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  // Resolve a library item via its external provider ids (tmdb/imdb/tvdb)
  async findItem(type: 'Movie' | 'Series', ids: { tmdbId?: number; imdbId?: string; tvdbId?: number }): Promise<EmbyItemRef | null> {
    const providerIds = [
      ids.tmdbId ? `tmdb.${ids.tmdbId}` : null,
      ids.imdbId ? `imdb.${ids.imdbId}` : null,
      ids.tvdbId ? `tvdb.${ids.tvdbId}` : null,
    ].filter(Boolean) as string[];

    for (const providerId of providerIds) {
      const { data } = await this.client.get('/Items', {
        params: { Recursive: true, IncludeItemTypes: type, AnyProviderIdEquals: providerId, Limit: 1 },
      });
      const item = data.Items?.[0];
      if (item) return { Id: item.Id, ServerId: item.ServerId, Name: item.Name };
    }
    return null;
  }

  itemWebUrl(item: EmbyItemRef): string {
    return `${this.baseUrl}/web/index.html#!/item?id=${item.Id}&serverId=${item.ServerId}`;
  }
}
