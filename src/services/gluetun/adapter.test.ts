import { GluetunAdapter } from './adapter';

const mockGet = jest.fn(); const mockPut = jest.fn();
jest.mock('../../core/api/httpClient', () => ({ createServiceClient: () => ({ get: mockGet, put: mockPut }) }));

describe('GluetunAdapter', () => {
  let adapter: GluetunAdapter;
  beforeEach(() => {
    [mockGet, mockPut].forEach(m => m.mockReset());
    adapter = new GluetunAdapter({ serviceId: 'gluetun' as const, enabled: true, localUrl: 'http://nas:8000', remoteUrl: 'http://nas:8000' }, true);
  });

  const oldBuild = () => mockGet.mockImplementation((url: string) =>
    url === '/v1/version'
      ? Promise.resolve({ data: '<html>spa</html>' })
      : Promise.resolve({ data: { status: 'running' } }));

  test('old builds detected via SPA response use the /api/v1 prefix', async () => {
    oldBuild();
    await adapter.getVpnStatus();
    await adapter.getPublicIp();
    await adapter.getPortForward();
    await adapter.getServerChoices();
    expect(mockGet.mock.calls.map(c => c[0])).toEqual([
      '/v1/version', '/api/v1/vpn/status', '/api/v1/publicip/ip', '/api/v1/portforward', '/api/v1/vpn/serverchoices',
    ]);
  });

  test('new builds serving JSON at /v1 use the root prefix', async () => {
    mockGet.mockImplementation((url: string) =>
      url === '/v1/version'
        ? Promise.resolve({ data: { version: 'v3.41.1' } })
        : Promise.resolve({ data: { status: 'running' } }));
    await adapter.getVpnStatus();
    expect(mockGet.mock.calls.map(c => c[0])).toEqual(['/v1/version', '/v1/vpn/status']);
  });

  test('setVpnStatus PUTs the status body', async () => {
    oldBuild();
    mockPut.mockResolvedValue({ data: {} });
    await adapter.setVpnStatus('stopped');
    expect(mockPut).toHaveBeenCalledWith('/api/v1/vpn/status', { status: 'stopped' });
  });

  test('getStatus reports exit IP when running', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/v1/version') return Promise.resolve({ data: '<html>spa</html>' });
      if (url === '/api/v1/vpn/status') return Promise.resolve({ data: { status: 'running' } });
      if (url === '/api/v1/publicip/ip') return Promise.resolve({ data: { public_ip: '1.2.3.4', city: 'Amsterdam', country: 'Netherlands' } });
      return Promise.reject(new Error('unexpected'));
    });
    const status = await adapter.getStatus();
    expect(status.summary).toBe('Connected');
    expect(status.metric?.value).toBe('1.2.3.4');
    expect(status.metric?.label).toBe('Amsterdam, Netherlands');
  });

  test('changeLocation merges selection, preserves other fields, and cycles the VPN in order', async () => {
    mockGet.mockImplementation((url: string) => url === '/v1/version'
      ? Promise.resolve({ data: '<html>spa</html>' })
      : Promise.resolve({
      data: {
        type: 'openvpn',
        provider: {
          name: 'protonvpn',
          server_selection: { vpn: 'openvpn', countries: ['india'], cities: null, port_forward_only: true },
        },
      },
    }));
    mockPut.mockResolvedValue({ data: {} });

    await adapter.changeLocation(['netherlands'], ['amsterdam']);

    expect(mockGet).toHaveBeenCalledWith('/api/v1/vpn/settings');
    expect(mockPut.mock.calls.map(c => c[0])).toEqual([
      '/api/v1/vpn/settings', '/api/v1/vpn/status', '/api/v1/vpn/status',
    ]);
    const putSettings = mockPut.mock.calls[0][1];
    expect(putSettings.provider.server_selection).toEqual({
      vpn: 'openvpn', countries: ['netherlands'], cities: ['amsterdam'], port_forward_only: true,
    });
    expect(putSettings.type).toBe('openvpn');
    expect(mockPut.mock.calls[1][1]).toEqual({ status: 'stopped' });
    expect(mockPut.mock.calls[2][1]).toEqual({ status: 'running' });
  });

  test('changeLocation with empty arrays clears the selection', async () => {
    mockGet.mockImplementation((url: string) => url === '/v1/version'
      ? Promise.resolve({ data: '<html>spa</html>' })
      : Promise.resolve({ data: { provider: { name: 'p', server_selection: { countries: ['x'] } } } }));
    mockPut.mockResolvedValue({ data: {} });
    await adapter.changeLocation([], []);
    expect(mockPut.mock.calls[0][1].provider.server_selection.countries).toBeNull();
    expect(mockPut.mock.calls[0][1].provider.server_selection.cities).toBeNull();
  });
});
