import { BazarrAdapter } from './adapter';

const mockGet = jest.fn(); const mockPost = jest.fn(); const mockPatch = jest.fn();
jest.mock('../../core/api/httpClient', () => ({ createServiceClient: () => ({ get: mockGet, post: mockPost, patch: mockPatch }) }));

describe('BazarrAdapter', () => {
  let adapter: BazarrAdapter;
  beforeEach(() => { [mockGet, mockPost, mockPatch].forEach(m => m.mockReset());
    adapter = new BazarrAdapter({ serviceId: 'bazarr' as const, enabled: true, localUrl: 'http://localhost:6767', remoteUrl: 'http://localhost:6767', apiKey: 'key' }, true); });

  test('getBadges returns wanted counts', async () => {
    mockGet.mockResolvedValue({ data: { data: { episodes: 5, movies: 2, providers: 0, status: 0 } } });
    const badges = await adapter.getBadges();
    expect(mockGet).toHaveBeenCalledWith('/api/badges');
    expect(badges.episodes).toBe(5);
  });

  test('getEpisodeSubtitles fetches for series', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ sonarrEpisodeId: 1, subtitles: [], missing_subtitles: [{ code2: 'en' }] }] } });
    const subs = await adapter.getEpisodeSubtitles(42);
    expect(subs[0].missing_subtitles).toHaveLength(1);
  });

  test('searchEpisodeSubtitles searches providers', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ provider: 'OpenSubtitles', score: 90 }] } });
    const results = await adapter.searchEpisodeSubtitles(1);
    expect(results[0].provider).toBe('OpenSubtitles');
  });

  test('getWantedEpisodes fetches paginated', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ sonarrEpisodeId: 1, title: 'Test' }], total: 1 } });
    const wanted = await adapter.getWantedEpisodes();
    expect(wanted.records).toHaveLength(1);
  });
});
