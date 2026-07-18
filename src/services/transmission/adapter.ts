import { AxiosInstance } from 'axios';
import { createTransmissionClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { Torrent, SessionStats, TransmissionSession } from './types';

const TORRENT_FIELDS = [
  'id',
  'name',
  'status',
  'percentDone',
  'rateDownload',
  'rateUpload',
  'eta',
  'totalSize',
  'uploadRatio',
  'peersConnected',
  'labels',
  'queuePosition',
  'downloadDir',
  'errorString',
  'addedDate',
  'doneDate',
  'files',
  'fileStats',
  'hashString',
  'isFinished',
  'magnetLink',
  'sizeWhenDone',
  'peersGettingFromUs',
  'peersSendingToUs',
];

export class TransmissionAdapter {
  readonly id = 'transmission' as const;
  private client: AxiosInstance;

  constructor(config: ServiceConfig, isLocal: boolean) {
    this.client = createTransmissionClient(config, isLocal);
  }

  private async rpc<T>(method: string, args?: Record<string, any>): Promise<T> {
    const { data } = await this.client.post('', { method, arguments: args });
    if (data.result !== 'success') throw new Error(`Transmission RPC error: ${data.result}`);
    return data.arguments;
  }

  async testConnection(): Promise<boolean> {
    await this.rpc('session-get');
    return true;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const stats = await this.getSessionStats();
      return {
        serviceId: 'transmission',
        connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: `${stats.activeTorrentCount} active`,
        metric: { value: stats.activeTorrentCount, label: 'active' },
      };
    } catch (e: any) {
      return {
        serviceId: 'transmission',
        connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message },
        summary: 'Connection failed',
      };
    }
  }

  async getTorrents(ids?: number[]): Promise<Torrent[]> {
    const args: Record<string, any> = { fields: TORRENT_FIELDS };
    if (ids) args.ids = ids;
    const result = await this.rpc<{ torrents: Torrent[] }>('torrent-get', args);
    return result.torrents;
  }

  async getSessionStats(): Promise<SessionStats> {
    return this.rpc<SessionStats>('session-stats');
  }

  async getSession(): Promise<TransmissionSession> {
    return this.rpc<TransmissionSession>('session-get');
  }

  async addTorrent(args: {
    filename?: string;
    metainfo?: string;
    downloadDir?: string;
    labels?: string[];
    paused?: boolean;
  }): Promise<void> {
    await this.rpc('torrent-add', args);
  }

  async startTorrents(ids: number[]): Promise<void> {
    await this.rpc('torrent-start', { ids });
  }

  async stopTorrents(ids: number[]): Promise<void> {
    await this.rpc('torrent-stop', { ids });
  }

  async removeTorrents(ids: number[], deleteLocalData: boolean): Promise<void> {
    await this.rpc('torrent-remove', { ids, 'delete-local-data': deleteLocalData });
  }

  async setTorrent(ids: number[], settings: Record<string, any>): Promise<void> {
    await this.rpc('torrent-set', { ids, ...settings });
  }

  async moveTorrentInQueue(ids: number[], position: 'top' | 'up' | 'down' | 'bottom'): Promise<void> {
    await this.rpc(`queue-move-${position}`, { ids });
  }

  async setSession(settings: Partial<TransmissionSession>): Promise<void> {
    await this.rpc('session-set', settings);
  }

  async getFreeSpace(path: string): Promise<number> {
    const result = await this.rpc<{ 'size-bytes': number }>('free-space', { path });
    return result['size-bytes'];
  }

}
