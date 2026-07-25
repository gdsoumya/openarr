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
      return this.prefix;
    } catch (e: any) {
      // Only a definite "route missing" pins the legacy prefix; a network
      // blip must not permanently misroute a standard /v1 build
      if (e.response) {
        this.prefix = '/api/v1';
        return this.prefix;
      }
      throw e;
    }
  }

  // The SPA catch-all answers ANY path with HTML 200, so a pinned prefix can
  // silently go stale when the container is swapped for a build that moved the
  // API. Getting HTML where JSON belongs means the prefix is wrong: re-probe
  // once and retry instead of serving garbage until app restart.
  private async getJson<T>(path: string, retried = false): Promise<T> {
    const { data } = await this.client.get(`${await this.api()}${path}`);
    if (data && typeof data === 'object') return data as T;
    if (!retried) {
      this.prefix = null;
      return this.getJson<T>(path, true);
    }
    throw new Error('Unexpected response from the gluetun control server');
  }

  async testConnection(): Promise<boolean> {
    await this.getJson('/version');
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
      // Exit IP changes only on reconnect, cache it briefly to halve status calls
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

  async getVersion(): Promise<GluetunVersion> { return this.getJson('/version'); }
  async getVpnStatus(): Promise<VpnStatus> { return this.getJson('/vpn/status'); }
  async setVpnStatus(status: 'running' | 'stopped'): Promise<void> {
    await this.client.put(`${await this.api()}/vpn/status`, { status });
    this.ipCache = null;
  }
  async getPublicIp(): Promise<PublicIp> { return this.getJson('/publicip/ip'); }
  async refreshPublicIp(): Promise<void> {
    await this.client.get(`${await this.api()}/publicip/refresh`);
    this.ipCache = null;
  }
  async getPortForward(): Promise<PortForward> { return this.getJson('/portforward'); }
  async getVpnSettings(): Promise<VpnSettings> { return this.getJson('/vpn/settings'); }
  async setVpnSettings(settings: VpnSettings): Promise<void> { await this.client.put(`${await this.api()}/vpn/settings`, settings); }
  async getServerChoices(): Promise<ServerChoices> { return this.getJson('/vpn/serverchoices'); }
  async getDnsStatus(): Promise<DnsStatus> { return this.getJson('/dns/status'); }
  async setDnsStatus(status: string): Promise<void> { await this.client.put(`${await this.api()}/dns/status`, { status }); }
  async getUpdaterStatus(): Promise<UpdaterStatus> { return this.getJson('/updater/status'); }
  async triggerUpdater(): Promise<void> { await this.client.put(`${await this.api()}/updater/status`, { status: 'running' }); }

  // Saving the selection alone does not re-dial, gluetun keeps the current
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
