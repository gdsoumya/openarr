import { AxiosInstance } from 'axios';
import { createServiceClient } from '../../core/api/httpClient';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { demuxDockerLogs } from './utils/dockerLogs';
import {
  ContainerInspect, ContainerStats, DockerContainer, DockerImage,
  DockerStatsRaw, PortainerEndpoint, PortainerStack,
} from './types';

export function computeStats(raw: DockerStatsRaw): ContainerStats {
  const cpuDelta = raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage;
  const systemDelta = (raw.cpu_stats.system_cpu_usage ?? 0) - (raw.precpu_stats.system_cpu_usage ?? 0);
  const cpus = raw.cpu_stats.online_cpus ?? 1;
  const cpuPercent = systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * cpus * 100 : 0;
  // Subtract page cache the way `docker stats` does
  const cache = raw.memory_stats.stats?.inactive_file ?? raw.memory_stats.stats?.cache ?? 0;
  return {
    cpuPercent,
    memUsed: Math.max(0, (raw.memory_stats.usage ?? 0) - cache),
    memLimit: raw.memory_stats.limit ?? 0,
  };
}

export class PortainerAdapter {
  readonly id = 'portainer' as const;
  private client: AxiosInstance;

  constructor(config: ServiceConfig, isLocal: boolean) {
    this.client = createServiceClient(config, isLocal);
  }

  private docker(endpointId: number): string {
    return `/api/endpoints/${endpointId}/docker`;
  }

  // /api/system/status is unauthenticated, so it can't validate the token
  async testConnection(): Promise<boolean> {
    await this.client.get('/api/endpoints');
    return true;
  }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const endpoints = await this.getEndpoints();
      let running = 0;
      let total = 0;
      for (const ep of endpoints) {
        const snap = ep.Snapshots?.[0];
        if (snap) {
          running += snap.RunningContainerCount;
          total += snap.RunningContainerCount + snap.StoppedContainerCount;
        }
      }
      return {
        serviceId: 'portainer',
        connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: `${running}/${total} containers running`,
        metric: { value: running, label: 'running' },
      };
    } catch (e: any) {
      return { serviceId: 'portainer', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getEndpoints(): Promise<PortainerEndpoint[]> {
    const { data } = await this.client.get('/api/endpoints');
    return data;
  }

  async getContainers(endpointId: number): Promise<DockerContainer[]> {
    const { data } = await this.client.get(`${this.docker(endpointId)}/containers/json`, { params: { all: true } });
    return data;
  }

  async inspectContainer(endpointId: number, id: string): Promise<ContainerInspect> {
    const { data } = await this.client.get(`${this.docker(endpointId)}/containers/${id}/json`);
    return data;
  }

  async startContainer(endpointId: number, id: string): Promise<void> {
    await this.client.post(`${this.docker(endpointId)}/containers/${id}/start`);
  }

  async stopContainer(endpointId: number, id: string): Promise<void> {
    await this.client.post(`${this.docker(endpointId)}/containers/${id}/stop`);
  }

  async restartContainer(endpointId: number, id: string): Promise<void> {
    await this.client.post(`${this.docker(endpointId)}/containers/${id}/restart`);
  }

  async killContainer(endpointId: number, id: string): Promise<void> {
    await this.client.post(`${this.docker(endpointId)}/containers/${id}/kill`);
  }

  async getContainerLogs(endpointId: number, id: string, tail = 100, timestamps = false): Promise<string> {
    const { data } = await this.client.get(`${this.docker(endpointId)}/containers/${id}/logs`, {
      params: { stdout: 1, stderr: 1, tail, timestamps: timestamps ? 1 : 0 },
      responseType: 'text',
      transformResponse: [(d) => d],
    });
    return demuxDockerLogs(typeof data === 'string' ? data : String(data));
  }

  async getContainerStats(endpointId: number, id: string): Promise<ContainerStats> {
    const { data } = await this.client.get<DockerStatsRaw>(`${this.docker(endpointId)}/containers/${id}/stats`, {
      params: { stream: false },
    });
    return computeStats(data);
  }

  async getStacks(): Promise<PortainerStack[]> {
    const { data } = await this.client.get('/api/stacks');
    return data;
  }

  async getStackFile(id: number): Promise<string> {
    const { data } = await this.client.get(`/api/stacks/${id}/file`);
    return data.StackFileContent ?? '';
  }

  async startStack(id: number, endpointId: number): Promise<void> {
    await this.client.post(`/api/stacks/${id}/start`, undefined, { params: { endpointId } });
  }

  async stopStack(id: number, endpointId: number): Promise<void> {
    await this.client.post(`/api/stacks/${id}/stop`, undefined, { params: { endpointId } });
  }

  async getImages(endpointId: number): Promise<DockerImage[]> {
    const { data } = await this.client.get(`${this.docker(endpointId)}/images/json`);
    return data;
  }
}
