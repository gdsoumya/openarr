import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import * as Application from 'expo-application';
import { ServerConfig } from '../types/services';

const LEGACY_KEY = 'openarr-enc-key';

// Per-device encryption key instead of a constant committed in source; the
// meta store records whether the credential store has been recrypted yet.
function deviceKey(): string {
  const androidId = Application.getAndroidId?.() ?? '';
  return androidId ? `openarr-${androidId}` : LEGACY_KEY;
}

const KEYS = {
  SERVERS: 'openarr.servers',
  ACTIVE_SERVER: 'openarr.activeServer',
} as const;

export class AppStorage {
  private mmkv: MMKV;

  constructor() {
    const meta = createMMKV({ id: 'openarr-meta' });
    const key = deviceKey();
    if (meta.getBoolean('encMigrated') && key !== LEGACY_KEY) {
      this.mmkv = createMMKV({ id: 'openarr-storage', encryptionKey: key });
    } else {
      this.mmkv = createMMKV({ id: 'openarr-storage', encryptionKey: LEGACY_KEY });
      if (key !== LEGACY_KEY) {
        try {
          this.mmkv.recrypt(key);
          meta.set('encMigrated', true);
        } catch {}
      }
    }
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

  // Generic key/value helpers for settings and small persisted state
  getValue(key: string): string | undefined {
    return this.mmkv.getString(key);
  }

  setValue(key: string, value: string | undefined): void {
    if (value === undefined) this.mmkv.remove(key);
    else this.mmkv.set(key, value);
  }

  getJSON<T>(key: string): T | undefined {
    const raw = this.mmkv.getString(key);
    if (!raw) return undefined;
    try { return JSON.parse(raw) as T; } catch { return undefined; }
  }

  setJSON(key: string, value: unknown): void {
    this.mmkv.set(key, JSON.stringify(value));
  }
}

export const appStorage = new AppStorage();
