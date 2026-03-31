import { ProwlarrAdapter } from './adapter';

const mockGet = jest.fn(); const mockPost = jest.fn();
jest.mock('../../core/api/httpClient', () => ({ createServiceClient: () => ({ get: mockGet, post: mockPost }) }));

describe('ProwlarrAdapter', () => {
  let adapter: ProwlarrAdapter;
  beforeEach(() => { [mockGet, mockPost].forEach(m => m.mockReset());
    adapter = new ProwlarrAdapter({ serviceId: 'prowlarr' as const, enabled: true, localUrl: 'http://localhost:9696', remoteUrl: 'http://localhost:9696', apiKey: 'key' }, true); });

  test('search queries indexers', async () => {
    mockGet.mockResolvedValue({ data: [{ guid: '1', title: 'Result', indexer: 'Test' }] });
    const results = await adapter.search({ query: 'test', type: 'search' });
    expect(mockGet).toHaveBeenCalledWith('/api/v1/search', { params: expect.objectContaining({ query: 'test', type: 'search' }) });
    expect(results[0].title).toBe('Result');
  });

  test('getIndexers lists all', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, name: 'Idx1', enable: true }] });
    const idx = await adapter.getIndexers();
    expect(idx[0].name).toBe('Idx1');
  });

  test('getIndexerStats returns stats', async () => {
    mockGet.mockResolvedValue({ data: { indexers: [{ indexerId: 1, numberOfQueries: 50 }] } });
    const stats = await adapter.getIndexerStats();
    expect(stats[0].numberOfQueries).toBe(50);
  });
});
