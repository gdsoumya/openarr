import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';

export interface EmbyItemRef { Id: string; ServerId: string; Name: string; }

export class EmbyAdapter {
  readonly id = 'emby' as const;
  private client: AxiosInstance;
  readonly baseUrl: string;

  constructor(config: ServiceConfig, isLocal: boolean) {
    this.client = createServiceClient(config, isLocal);
    this.baseUrl = (isLocal ? config.localUrl : config.remoteUrl).replace(/\/+$/, '');
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
