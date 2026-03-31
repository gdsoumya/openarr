import { ArrServiceAdapter } from '../shared-arr/adapter';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { PaginatedResult } from '../../core/types/common';
import { Series, Episode, EpisodeFile, AddSeriesConfig } from './types';

export class SonarrAdapter extends ArrServiceAdapter {
  readonly id = 'sonarr' as const;
  constructor(config: ServiceConfig, isLocal: boolean) { super(config, isLocal); }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const [series, queue] = await Promise.all([this.getSeries(), this.getQueue(1, 1)]);
      const dl = queue.totalRecords;
      return { serviceId: 'sonarr', connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: dl > 0 ? `${dl} downloading` : `${series.length} series`, metric: { value: series.length, label: 'series' } };
    } catch (e: any) {
      return { serviceId: 'sonarr', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getSeries(): Promise<Series[]> { const { data } = await this.client.get('/api/v3/series'); return data; }
  async getSeriesById(id: number): Promise<Series> { const { data } = await this.client.get(`/api/v3/series/${id}`); return data; }
  async lookupSeries(term: string): Promise<Series[]> { const { data } = await this.client.get('/api/v3/series/lookup', { params: { term } }); return data; }
  async addSeries(config: AddSeriesConfig): Promise<Series> { const { data } = await this.client.post('/api/v3/series', config); return data; }
  async editSeries(series: Series): Promise<Series> { const { data } = await this.client.put(`/api/v3/series/${series.id}`, series); return data; }
  async deleteSeries(id: number, deleteFiles: boolean): Promise<void> { await this.client.delete(`/api/v3/series/${id}`, { params: { deleteFiles } }); }

  async getEpisodes(seriesId: number): Promise<Episode[]> { const { data } = await this.client.get('/api/v3/episode', { params: { seriesId } }); return data; }
  async setEpisodeMonitored(episodeId: number, monitored: boolean): Promise<void> { await this.client.put(`/api/v3/episode/${episodeId}`, { monitored }); }
  async bulkSetEpisodesMonitored(episodeIds: number[], monitored: boolean): Promise<void> { await this.client.put('/api/v3/episode/monitor', { episodeIds, monitored }); }

  async getEpisodeFiles(seriesId: number): Promise<EpisodeFile[]> { const { data } = await this.client.get('/api/v3/episodefile', { params: { seriesId } }); return data; }
  async deleteEpisodeFile(id: number): Promise<void> { await this.client.delete(`/api/v3/episodefile/${id}`); }
  async bulkDeleteEpisodeFiles(ids: number[]): Promise<void> { await this.client.delete('/api/v3/episodefile/bulk', { data: { episodeFileIds: ids } }); }

  async getWantedMissing(page = 1, pageSize = 20): Promise<PaginatedResult<Episode>> {
    const { data } = await this.client.get('/api/v3/wanted/missing', { params: { page, pageSize, sortKey: 'airDateUtc', sortDirection: 'descending' } });
    return data;
  }

  async searchEpisode(episodeId: number): Promise<void> { await this.executeCommand('EpisodeSearch', { episodeIds: [episodeId] }); }
  async searchSeason(seriesId: number, seasonNumber: number): Promise<void> { await this.executeCommand('SeasonSearch', { seriesId, seasonNumber }); }
  async searchSeries(seriesId: number): Promise<void> { await this.executeCommand('SeriesSearch', { seriesId }); }
  async manualSearchEpisode(episodeId: number): Promise<any[]> { return this.manualSearch({ episodeId }); }
  async manualSearchSeason(seriesId: number, seasonNumber: number): Promise<any[]> { return this.manualSearch({ seriesId, seasonNumber }); }
  getTvdbIds(series: Series[]): number[] { return series.map(s => s.tvdbId); }
}
