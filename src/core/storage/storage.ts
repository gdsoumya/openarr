import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import { ServerConfig } from '../types/services';

const KEYS = {
  SERVERS: 'openarr.servers',
  ACTIVE_SERVER: 'openarr.activeServer',
} as const;

export class AppStorage {
  private mmkv: MMKV;

  constructor() {
    this.mmkv = createMMKV({ id: 'openarr-storage', encryptionKey: 'openarr-enc-key' });
  }

  getServers(): ServerConfig[] {
    const raw = this.mmkv.getString(KEYS.SERVERS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveServer(server: ServerConfig): void {
    const servers = this.getServers();
    const index = servers.findIndex((s) => s.id === server.id);
    if (index >= 0) {
      servers[index] = server;
    } else {
      servers.push(server);
    }
    this.mmkv.set(KEYS.SERVERS, JSON.stringify(servers));
  }

  deleteServer(id: string): void {
    const servers = this.getServers().filter((s) => s.id !== id);
    this.mmkv.set(KEYS.SERVERS, JSON.stringify(servers));
  }

  getActiveServerId(): string | undefined {
    return this.mmkv.getString(KEYS.ACTIVE_SERVER);
  }

  setActiveServerId(id: string): void {
    this.mmkv.set(KEYS.ACTIVE_SERVER, id);
  }
}

export const appStorage = new AppStorage();
