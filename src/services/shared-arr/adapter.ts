import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { ServiceId } from '../../core/theme/tokens';
import { PaginatedResult } from '../../core/types/common';
import { QualityProfile, RootFolder, Tag, QueueItem, HistoryItem, CalendarItem, Release } from './types';

export abstract class ArrServiceAdapter {
  abstract readonly id: ServiceId;
  protected client: AxiosInstance;

  constructor(config: ServiceConfig, isLocal: boolean) {
    this.client = createServiceClient(config, isLocal);
  }

  async testConnection(): Promise<boolean> {
    await this.client.get('/api/v3/system/status');
    return true;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      await this.client.get('/api/v3/system/status');
      return { serviceId: this.id, connection: { status: 'connected', isLocal: true, lastChecked: Date.now() }, summary: 'Connected' };
    } catch (e: any) {
      return { serviceId: this.id, connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getQualityProfiles(): Promise<QualityProfile[]> { const { data } = await this.client.get('/api/v3/qualityprofile'); return data; }
  async getRootFolders(): Promise<RootFolder[]> { const { data } = await this.client.get('/api/v3/rootfolder'); return data; }
  async getTags(): Promise<Tag[]> { const { data } = await this.client.get('/api/v3/tag'); return data; }

  async getQueue(page = 1, pageSize = 20): Promise<PaginatedResult<QueueItem>> {
    const { data } = await this.client.get('/api/v3/queue', { params: { page, pageSize, includeUnknownSeriesItems: true } });
    return data;
  }

  async getHistory(page = 1, pageSize = 20): Promise<PaginatedResult<HistoryItem>> {
    const { data } = await this.client.get('/api/v3/history', { params: { page, pageSize, sortKey: 'date', sortDirection: 'descending' } });
    return data;
  }

  async getCalendar(start: string, end: string): Promise<CalendarItem[]> {
    const { data } = await this.client.get('/api/v3/calendar', { params: { start, end } });
    return data;
  }

  async manualSearch(params: Record<string, any>): Promise<Release[]> {
    const { data } = await this.client.get('/api/v3/release', { params });
    return data;
  }

  async grabRelease(guid: string, indexerId: number): Promise<void> {
    await this.client.post('/api/v3/release', { guid, indexerId });
  }

  async executeCommand(name: string, body?: Record<string, any>): Promise<void> {
    await this.client.post('/api/v3/command', { name, ...body });
  }

  async getDiskSpace(): Promise<Array<{ path: string; freeSpace: number; totalSpace: number }>> {
    const { data } = await this.client.get('/api/v3/diskspace');
    return data;
  }
}
