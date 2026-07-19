import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import {
  DnsStatus, GluetunVersion, PortForward, PublicIp, ServerChoices,
  UpdaterStatus, VpnSettings, VpnStatus,
} from './types';

export class GluetunAdapter {
  readonly id = 'gluetun' as const;
  private client: AxiosInstance;
  // Older custom builds serve the control API under /api/v1 (web UI owns /),
  // newer builds serve it at /v1 upstream-style. Detect once and cache.
  private prefix: string | null = null;
  private ipCache: { ip: import('./types').PublicIp; at: number } | null = null;

  constructor(config: ServiceConfig, isLocal: boolean) {
    this.client = createServiceClient(config, isLocal);
  }

  private async api(): Promise<string> {
    if (this.prefix) return this.prefix;
    try {
      const { data } = await this.client.get('/v1/version');
      // The SPA catch-all answers 200 with HTML, so require a JSON shape
      this.prefix = data && typeof data === 'object' ? '/v1' : '/api/v1';
    } catch {
      this.prefix = '/api/v1';
    }
    return this.prefix;
  }

  async testConnection(): Promise<boolean> {
    await this.client.get(`${await this.api()}/version`);
    return true;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const vpn = await this.getVpnStatus();
      if (vpn.status !== 'running') {
        return {
          serviceId: 'gluetun',
          connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
          summary: 'VPN stopped',
        };
      }
      // Exit IP changes only on reconnect — cache it briefly to halve status calls
      let ip = this.ipCache && Date.now() - this.ipCache.at < 60000 ? this.ipCache.ip : null;
      if (!ip) {
        ip = await this.getPublicIp().catch(() => null);
        if (ip) this.ipCache = { ip, at: Date.now() };
      }
      const where = ip ? [ip.city, ip.country].filter(Boolean).join(', ') : '';
      return {
        serviceId: 'gluetun',
        connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: ip?.public_ip ? 'Connected' : 'Connecting...',
        metric: ip?.public_ip ? { value: ip.public_ip, label: where } : undefined,
      };
    } catch (e: any) {
      return { serviceId: 'gluetun', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getVersion(): Promise<GluetunVersion> { const { data } = await this.client.get(`${await this.api()}/version`); return data; }
  async getVpnStatus(): Promise<VpnStatus> { const { data } = await this.client.get(`${await this.api()}/vpn/status`); return data; }
  async setVpnStatus(status: 'running' | 'stopped'): Promise<void> { await this.client.put(`${await this.api()}/vpn/status`, { status }); }
  async getPublicIp(): Promise<PublicIp> { const { data } = await this.client.get(`${await this.api()}/publicip/ip`); return data; }
  async refreshPublicIp(): Promise<void> { await this.client.get(`${await this.api()}/publicip/refresh`); }
  async getPortForward(): Promise<PortForward> { const { data } = await this.client.get(`${await this.api()}/portforward`); return data; }
  async getVpnSettings(): Promise<VpnSettings> { const { data } = await this.client.get(`${await this.api()}/vpn/settings`); return data; }
  async setVpnSettings(settings: VpnSettings): Promise<void> { await this.client.put(`${await this.api()}/vpn/settings`, settings); }
  async getServerChoices(): Promise<ServerChoices> { const { data } = await this.client.get(`${await this.api()}/vpn/serverchoices`); return data; }
  async getDnsStatus(): Promise<DnsStatus> { const { data } = await this.client.get(`${await this.api()}/dns/status`); return data; }
  async setDnsStatus(status: string): Promise<void> { await this.client.put(`${await this.api()}/dns/status`, { status }); }
  async getUpdaterStatus(): Promise<UpdaterStatus> { const { data } = await this.client.get(`${await this.api()}/updater/status`); return data; }
  async triggerUpdater(): Promise<void> { await this.client.put(`${await this.api()}/updater/status`, { status: 'running' }); }

  // Saving the selection alone does not re-dial — gluetun keeps the current
  // tunnel until the VPN loop restarts, so cycle it after the settings PUT.
  // Callers should poll getPublicIp() afterwards (~2 min typical to settle).
  async changeLocation(countries: string[], cities: string[]): Promise<void> {
    const settings = await this.getVpnSettings();
    const updated: VpnSettings = {
      ...settings,
      provider: {
        ...settings.provider,
        server_selection: {
          ...settings.provider.server_selection,
          countries: countries.length ? countries : null,
          cities: cities.length ? cities : null,
        },
      },
    };
    await this.setVpnSettings(updated);
    await this.setVpnStatus('stopped');
    await this.setVpnStatus('running');
  }
}
