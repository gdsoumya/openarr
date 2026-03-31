import { ServiceId } from '../theme/tokens';
import { ConnectionState } from './common';

export interface ServerConfig {
  id: string;
  name: string;
  services: ServiceConfig[];
  homeSSIDs: string[];
  wolMacAddress?: string;
  wolBroadcastAddress?: string;
}

export interface ServiceConfig {
  serviceId: ServiceId;
  enabled: boolean;
  localUrl: string;
  remoteUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  customHeaders?: Record<string, string>;
  sslIgnoreCert?: boolean;
  basePath?: string;
}

export interface ServiceStatus {
  serviceId: ServiceId;
  connection: ConnectionState;
  summary: string;
  metric?: { value: string | number; label: string };
}

export interface ServiceAdapter {
  id: ServiceId;
  testConnection(config: ServiceConfig): Promise<boolean>;
  getStatus(config: ServiceConfig): Promise<ServiceStatus>;
}
