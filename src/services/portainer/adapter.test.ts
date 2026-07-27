import { PortainerAdapter, computeStats } from './adapter';

const mockGet = jest.fn(); const mockPost = jest.fn(); const mockPut = jest.fn();
jest.mock('../../core/api/httpClient', () => ({ createServiceClient: () => ({ get: mockGet, post: mockPost, put: mockPut }) }));

describe('PortainerAdapter', () => {
  let adapter: PortainerAdapter;
  beforeEach(() => {
    [mockGet, mockPost, mockPut].forEach(m => m.mockReset());
    adapter = new PortainerAdapter({ serviceId: 'portainer' as const, enabled: true, localUrl: 'https://nas:9443', remoteUrl: 'https://nas:9443', apiKey: 'token' }, true);
  });

  test('getContainers hits the docker proxy with all=true', async () => {
    mockGet.mockResolvedValue({ data: [{ Id: 'abc', Names: ['/sonarr'], State: 'running' }] });
    const containers = await adapter.getContainers(2);
    expect(mockGet).toHaveBeenCalledWith('/api/endpoints/2/docker/containers/json', { params: { all: true } });
    expect(containers[0].Names[0]).toBe('/sonarr');
  });

  test('lifecycle actions post to the docker proxy', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await adapter.startContainer(2, 'abc');
    await adapter.stopContainer(2, 'abc');
    await adapter.restartContainer(2, 'abc');
    await adapter.killContainer(2, 'abc');
    expect(mockPost.mock.calls.map(c => c[0])).toEqual([
      '/api/endpoints/2/docker/containers/abc/start',
      '/api/endpoints/2/docker/containers/abc/stop',
      '/api/endpoints/2/docker/containers/abc/restart',
      '/api/endpoints/2/docker/containers/abc/kill',
    ]);
  });

  test('stack lifecycle passes endpointId as query param', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await adapter.startStack(4, 2);
    await adapter.stopStack(4, 2);
    expect(mockPost).toHaveBeenCalledWith('/api/stacks/4/start', undefined, { params: { endpointId: 2 }, timeout: 600000 });
    expect(mockPost).toHaveBeenCalledWith('/api/stacks/4/stop', undefined, { params: { endpointId: 2 }, timeout: 600000 });
  });

  test('getStatus aggregates snapshot counts', async () => {
    mockGet.mockResolvedValue({
      data: [{ Id: 2, Name: 'local', Status: 1, Snapshots: [{ RunningContainerCount: 12, StoppedContainerCount: 3 }] }],
    });
    const status = await adapter.getStatus();
    expect(status.summary).toBe('12/15 containers running');
    expect(status.metric).toEqual({ value: 12, label: 'running' });
  });

  test('pruneImages posts the dangling=false filter and summarizes the result', async () => {
    mockPost.mockResolvedValue({ data: { ImagesDeleted: [{}, {}, {}], SpaceReclaimed: 1073741824 } });
    const result = await adapter.pruneImages(2);
    expect(mockPost).toHaveBeenCalledWith('/api/endpoints/2/docker/images/prune', undefined, {
      params: { filters: JSON.stringify({ dangling: ['false'] }) },
      timeout: 300000,
    });
    expect(result).toEqual({ imagesDeleted: 3, spaceReclaimed: 1073741824 });
  });

  test('getStackFile unwraps StackFileContent', async () => {
    mockGet.mockResolvedValue({ data: { StackFileContent: 'version: "3"' } });
    expect(await adapter.getStackFile(4)).toBe('version: "3"');
  });

  test('redeployStack re-submits the current file with PullImage', async () => {
    mockGet.mockResolvedValue({ data: { StackFileContent: 'version: "3"' } });
    mockPut.mockResolvedValue({ data: {} });
    const stack = { Id: 4, Name: 'media', Status: 2, Type: 2, EndpointId: 2, Env: [{ name: 'TZ', value: 'UTC' }] } as any;
    await adapter.redeployStack(stack, 2);
    expect(mockGet).toHaveBeenCalledWith('/api/stacks/4/file');
    expect(mockPut).toHaveBeenCalledWith('/api/stacks/4', {
      StackFileContent: 'version: "3"',
      Env: [{ name: 'TZ', value: 'UTC' }],
      PullImage: true,
    }, { params: { endpointId: 2 }, timeout: 600000 });
  });

  test('redeployStack uses git redeploy for git-backed stacks', async () => {
    mockPut.mockResolvedValue({ data: {} });
    const stack = { Id: 7, GitConfig: { URL: 'https://x', ReferenceName: 'refs/heads/main' } } as any;
    await adapter.redeployStack(stack, 2);
    expect(mockPut).toHaveBeenCalledWith('/api/stacks/7/git/redeploy', {
      RepositoryReferenceName: 'refs/heads/main',
      RepositoryAuthentication: false,
      PullImage: true,
      Prune: false,
    }, { params: { endpointId: 2 }, timeout: 600000 });
  });
});

describe('computeStats', () => {
  test('computes CPU percent from deltas and cpus', () => {
    const stats = computeStats({
      cpu_stats: { cpu_usage: { total_usage: 400 }, system_cpu_usage: 2000, online_cpus: 4 },
      precpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 1000 },
      memory_stats: { usage: 1000, limit: 4000, stats: { inactive_file: 200 } },
    });
    // (200 / 1000) * 4 * 100 = 80%
    expect(stats.cpuPercent).toBe(80);
    expect(stats.memUsed).toBe(800);
    expect(stats.memLimit).toBe(4000);
  });

  test('handles missing fields without NaN', () => {
    const stats = computeStats({
      cpu_stats: { cpu_usage: { total_usage: 0 } },
      precpu_stats: { cpu_usage: { total_usage: 0 } },
      memory_stats: {},
    });
    expect(stats.cpuPercent).toBe(0);
    expect(stats.memUsed).toBe(0);
    expect(stats.memLimit).toBe(0);
  });
});
