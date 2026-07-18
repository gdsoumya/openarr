import { BazarrAdapter } from './adapter';
import { SubtitleSearchResult } from './types';

const mockGet = jest.fn(); const mockPost = jest.fn(); const mockPatch = jest.fn(); const mockDelete = jest.fn();
jest.mock('../../core/api/httpClient', () => ({ createServiceClient: () => ({ get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete }) }));

const searchResult: SubtitleSearchResult = {
  provider: 'opensubtitlescom', release_info: ['Test.Release'], score: 90, language: 'en',
  forced: 'False', hearing_impaired: 'False', original_format: 'True',
  matches: [], dont_matches: [], subtitle: 'sub-id-123',
};

describe('BazarrAdapter', () => {
  let adapter: BazarrAdapter;
  beforeEach(() => { [mockGet, mockPost, mockPatch, mockDelete].forEach(m => m.mockReset());
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

  test('downloadEpisodeSubtitle sends provider params as query args', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await adapter.downloadEpisodeSubtitle(95, 1718, searchResult);
    expect(mockPost).toHaveBeenCalledWith('/api/providers/episodes', undefined, {
      params: {
        seriesid: 95, episodeid: 1718, provider: 'opensubtitlescom', subtitle: 'sub-id-123',
        hi: 'False', forced: 'False', original_format: 'True',
      },
    });
  });

  test('autoDownloadEpisodeSubtitle PATCHes with stringified booleans', async () => {
    mockPatch.mockResolvedValue({ data: {} });
    await adapter.autoDownloadEpisodeSubtitle(95, 1718, { code2: 'en', name: 'English', forced: false, hi: true });
    expect(mockPatch).toHaveBeenCalledWith('/api/episodes/subtitles', undefined, {
      params: { seriesid: 95, episodeid: 1718, language: 'en', forced: 'False', hi: 'True' },
    });
  });

  test('deleteMovieSubtitle passes the file path', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    await adapter.deleteMovieSubtitle(7, { code2: 'en', name: 'English', forced: false, hi: false, path: '/movies/x.en.srt' });
    expect(mockDelete).toHaveBeenCalledWith('/api/movies/subtitles', {
      params: { radarrid: 7, language: 'en', forced: 'False', hi: 'False', path: '/movies/x.en.srt' },
    });
  });

  test('subtitleAction PATCHes /api/subtitles with the action', async () => {
    mockPatch.mockResolvedValue({ data: {} });
    await adapter.subtitleAction({ action: 'sync', language: 'en', path: '/tv/x.srt', type: 'episode', id: 1718 });
    expect(mockPatch).toHaveBeenCalledWith('/api/subtitles', undefined, {
      params: { action: 'sync', language: 'en', path: '/tv/x.srt', type: 'episode', id: 1718, forced: 'False', hi: 'False' },
    });
  });

  test('blacklist add and remove use the right endpoints', async () => {
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
    await adapter.blacklistEpisodeSubtitle({ seriesid: 95, episodeid: 1718, provider: 'p', subs_id: 's1', language: 'en', subtitles_path: '/tv/x.srt' });
    await adapter.removeFromEpisodeBlacklist('p', 's1');
    expect(mockPost).toHaveBeenCalledWith('/api/episodes/blacklist', undefined, {
      params: { seriesid: 95, episodeid: 1718, provider: 'p', subs_id: 's1', language: 'en', subtitles_path: '/tv/x.srt' },
    });
    expect(mockDelete).toHaveBeenCalledWith('/api/episodes/blacklist', { params: { provider: 'p', subs_id: 's1' } });
  });

  test('searchAllWanted runs the series and movies wanted-search tasks', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await adapter.searchAllWanted();
    expect(mockPost).toHaveBeenCalledWith('/api/system/tasks', undefined, { params: { taskid: 'wanted_search_missing_subtitles_series' } });
    expect(mockPost).toHaveBeenCalledWith('/api/system/tasks', undefined, { params: { taskid: 'wanted_search_missing_subtitles_movies' } });
  });
});
