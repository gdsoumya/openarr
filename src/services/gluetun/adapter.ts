import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import {
  DnsStatus, GluetunVersion, PortForward, PublicIp, ServerChoices,
  UpdaterStatus, VpnSettings, VpnStatus,
} from './types';

// The custom gluetun build serves its web UI at / and the control API under /api
const API = '/api/v1';

export class GluetunAdapter {
  readonly id = 'gluetun' as const;
  private client: AxiosInstance;

  constructor(config: ServiceConfig, isLocal: boolean) {
    this.client = createServiceClient(config, isLocal);
  }

  async testConnection(): Promise<boolean> {
    await this.client.get(`${API}/version`);
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
      const ip = await this.getPublicIp().catch(() => null);
      const where = ip ? [ip.city, ip.country].filter(Boolean).join(', ') : '';
      return {
        serviceId: 'gluetun',
        connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: ip?.public_ip ? `Connected — ${where || ip.public_ip}` : 'Connecting...',
        metric: ip?.public_ip ? { value: ip.public_ip, label: 'exit IP' } : undefined,
      };
    } catch (e: any) {
      return { serviceId: 'gluetun', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getVersion(): Promise<GluetunVersion> { const { data } = await this.client.get(`${API}/version`); return data; }
  async getVpnStatus(): Promise<VpnStatus> { const { data } = await this.client.get(`${API}/vpn/status`); return data; }
  async setVpnStatus(status: 'running' | 'stopped'): Promise<void> { await this.client.put(`${API}/vpn/status`, { status }); }
  async getPublicIp(): Promise<PublicIp> { const { data } = await this.client.get(`${API}/publicip/ip`); return data; }
  async refreshPublicIp(): Promise<void> { await this.client.get(`${API}/publicip/refresh`); }
  async getPortForward(): Promise<PortForward> { const { data } = await this.client.get(`${API}/portforward`); return data; }
  async getVpnSettings(): Promise<VpnSettings> { const { data } = await this.client.get(`${API}/vpn/settings`); return data; }
  async setVpnSettings(settings: VpnSettings): Promise<void> { await this.client.put(`${API}/vpn/settings`, settings); }
  async getServerChoices(): Promise<ServerChoices> { const { data } = await this.client.get(`${API}/vpn/serverchoices`); return data; }
  async getDnsStatus(): Promise<DnsStatus> { const { data } = await this.client.get(`${API}/dns/status`); return data; }
  async setDnsStatus(status: string): Promise<void> { await this.client.put(`${API}/dns/status`, { status }); }
  async getUpdaterStatus(): Promise<UpdaterStatus> { const { data } = await this.client.get(`${API}/updater/status`); return data; }
  async triggerUpdater(): Promise<void> { await this.client.put(`${API}/updater/status`, { status: 'running' }); }

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
