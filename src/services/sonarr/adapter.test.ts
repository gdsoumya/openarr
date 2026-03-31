import { SonarrAdapter } from './adapter';

const mockGet = jest.fn(); const mockPost = jest.fn(); const mockPut = jest.fn(); const mockDelete = jest.fn();
jest.mock('../../core/api/httpClient', () => ({ createServiceClient: () => ({ get: mockGet, post: mockPost, put: mockPut, delete: mockDelete }) }));

describe('SonarrAdapter', () => {
  let adapter: SonarrAdapter;
  beforeEach(() => { [mockGet, mockPost, mockPut, mockDelete].forEach(m => m.mockReset());
    adapter = new SonarrAdapter({ serviceId: 'sonarr' as const, enabled: true, localUrl: 'http://localhost:8989', remoteUrl: 'http://localhost:8989', apiKey: 'key' }, true); });

  test('getSeries fetches all series', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, title: 'Test Show', tvdbId: 123 }] });
    const series = await adapter.getSeries();
    expect(mockGet).toHaveBeenCalledWith('/api/v3/series');
    expect(series[0].title).toBe('Test Show');
  });

  test('getEpisodes fetches for series', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, episodeNumber: 1, title: 'Pilot' }] });
    const eps = await adapter.getEpisodes(1);
    expect(mockGet).toHaveBeenCalledWith('/api/v3/episode', { params: { seriesId: 1 } });
    expect(eps[0].title).toBe('Pilot');
  });

  test('addSeries posts new series', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await adapter.addSeries({ tvdbId: 456, title: 'New', qualityProfileId: 1, rootFolderPath: '/tv', seriesType: 'standard', monitored: true, tags: [], addOptions: { monitor: 'all', searchForMissingEpisodes: true } });
    expect(mockPost).toHaveBeenCalledWith('/api/v3/series', expect.objectContaining({ tvdbId: 456 }));
  });

  test('searchEpisode triggers command', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await adapter.searchEpisode(42);
    expect(mockPost).toHaveBeenCalledWith('/api/v3/command', { name: 'EpisodeSearch', episodeIds: [42] });
  });

  test('deleteSeries removes series', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    await adapter.deleteSeries(1, true);
    expect(mockDelete).toHaveBeenCalledWith('/api/v3/series/1', { params: { deleteFiles: true } });
  });
});
