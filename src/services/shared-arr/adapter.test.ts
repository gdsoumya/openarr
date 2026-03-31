import { ArrServiceAdapter } from './adapter';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../../core/api/httpClient', () => ({
  createServiceClient: () => ({ get: mockGet, post: mockPost, put: jest.fn(), delete: jest.fn() }),
}));

class TestArrAdapter extends ArrServiceAdapter { readonly id = 'sonarr' as const; }

describe('ArrServiceAdapter', () => {
  let adapter: TestArrAdapter;
  beforeEach(() => {
    [mockGet, mockPost].forEach(m => m.mockReset());
    adapter = new TestArrAdapter({ serviceId: 'sonarr' as const, enabled: true, localUrl: 'http://localhost:8989', remoteUrl: 'http://localhost:8989', apiKey: 'key' }, true);
  });

  test('getQualityProfiles fetches from API', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, name: 'HD-1080p' }] });
    const profiles = await adapter.getQualityProfiles();
    expect(mockGet).toHaveBeenCalledWith('/api/v3/qualityprofile');
    expect(profiles[0].name).toBe('HD-1080p');
  });

  test('getRootFolders fetches from API', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, path: '/tv', freeSpace: 100000 }] });
    const folders = await adapter.getRootFolders();
    expect(folders[0].path).toBe('/tv');
  });

  test('getQueue fetches paginated queue', async () => {
    mockGet.mockResolvedValue({ data: { page: 1, pageSize: 20, totalRecords: 1, records: [{ id: 1, title: 'test' }] } });
    const queue = await adapter.getQueue();
    expect(queue.records).toHaveLength(1);
  });

  test('grabRelease posts to API', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await adapter.grabRelease('guid-123', 1);
    expect(mockPost).toHaveBeenCalledWith('/api/v3/release', { guid: 'guid-123', indexerId: 1 });
  });
});
