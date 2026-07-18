import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { PaginatedResult } from '../../core/types/common';
import { SearchResult, SearchType, Indexer, IndexerStatus, IndexerStats, SearchHistoryItem } from './types';

interface SearchParams { query: string; type?: SearchType; indexerIds?: number[]; categories?: number[]; limit?: number; offset?: number; }

export class ProwlarrAdapter {
  readonly id = 'prowlarr' as const;
  private client: AxiosInstance;

  constructor(config: ServiceConfig, isLocal: boolean) { this.client = createServiceClient(config, isLocal); }

  async testConnection(): Promise<boolean> {
    await this.client.get('/api/v1/system/status');
    return true;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const indexers = await this.getIndexers();
      const enabled = indexers.filter(i => i.enable).length;
      return { serviceId: 'prowlarr', connection: { status: 'connected', isLocal: true, lastChecked: Date.now() }, summary: `${enabled} indexers active` };
    } catch (e: any) {
      return { serviceId: 'prowlarr', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    const { data } = await this.client.get('/api/v1/search', { params: { query: params.query, type: params.type ?? 'search', indexerIds: params.indexerIds, categories: params.categories, limit: params.limit ?? 100, offset: params.offset ?? 0 } });
    return data;
  }

  // Pushes the release to Prowlarr's configured download client, keeping grab history/tracking
  async grabSearchResult(guid: string, indexerId: number): Promise<void> {
    await this.client.post('/api/v1/search', { guid, indexerId });
  }

  async getIndexers(): Promise<Indexer[]> { const { data } = await this.client.get('/api/v1/indexer'); return data; }
  async getIndexerStatuses(): Promise<IndexerStatus[]> { const { data } = await this.client.get('/api/v1/indexerstatus'); return data; }
  async getIndexerStats(): Promise<IndexerStats[]> { const { data } = await this.client.get('/api/v1/indexerstats'); return data.indexers; }
  async getHistory(page = 1, pageSize = 20): Promise<PaginatedResult<SearchHistoryItem>> { const { data } = await this.client.get('/api/v1/history', { params: { page, pageSize } }); return data; }
  async getCategories(): Promise<Array<{ id: number; name: string; subCategories: any[] }>> { const { data } = await this.client.get('/api/v1/indexer/categories'); return data; }

  async testAllIndexers(): Promise<void> {
    await this.client.post('/api/v1/indexer/testall');
  }

  async syncIndexers(): Promise<void> {
    // Trigger app sync (pushes indexer config to Sonarr/Radarr)
    await this.client.post('/api/v1/command', { name: 'AppIndexerSync' });
  }
}
