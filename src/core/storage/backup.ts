import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { appStorage } from './storage';
import { ServerConfig } from '../types/services';

export interface BackupData {
  version: 1;
  exportedAt: string;
  servers: ServerConfig[];
  activeServerId?: string;
}

export function createBackup(): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    servers: appStorage.getServers(),
    activeServerId: appStorage.getActiveServerId(),
  };
}

export async function exportBackup(): Promise<void> {
  const data = createBackup();
  const json = JSON.stringify(data, null, 2);
  const path = `${FileSystem.documentDirectory}openarr-backup.json`;
  await FileSystem.writeAsStringAsync(path, json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export OpenArr Backup',
    });
  }
}

export function restoreBackup(data: BackupData): void {
  if (data.version !== 1) throw new Error('Unsupported backup version');

  // Clear existing servers and restore from backup
  const existing = appStorage.getServers();
  existing.forEach(s => appStorage.deleteServer(s.id));

  data.servers.forEach(server => appStorage.saveServer(server));
  if (data.activeServerId) appStorage.setActiveServerId(data.activeServerId);
}

export function parseBackupFile(json: string): BackupData {
  const data = JSON.parse(json);
  if (!data.version || !data.servers || !Array.isArray(data.servers)) {
    throw new Error('Invalid backup file format');
  }
  return data as BackupData;
}
