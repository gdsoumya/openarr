import { RadarrAdapter } from './adapter';

const mockGet = jest.fn(); const mockPost = jest.fn(); const mockPut = jest.fn(); const mockDelete = jest.fn();
jest.mock('../../core/api/httpClient', () => ({ createServiceClient: () => ({ get: mockGet, post: mockPost, put: mockPut, delete: mockDelete }) }));

describe('RadarrAdapter', () => {
  let adapter: RadarrAdapter;
  beforeEach(() => { [mockGet, mockPost, mockPut, mockDelete].forEach(m => m.mockReset());
    adapter = new RadarrAdapter({ serviceId: 'radarr' as const, enabled: true, localUrl: 'http://localhost:7878', remoteUrl: 'http://localhost:7878', apiKey: 'key' }, true); });

  test('getMovies fetches all movies', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, title: 'Test Movie', tmdbId: 456 }] });
    const movies = await adapter.getMovies();
    expect(mockGet).toHaveBeenCalledWith('/api/v3/movie');
    expect(movies[0].title).toBe('Test Movie');
  });

  test('addMovie posts new movie', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await adapter.addMovie({ tmdbId: 789, title: 'New', qualityProfileId: 1, rootFolderPath: '/movies', monitored: true, minimumAvailability: 'released', tags: [], addOptions: { searchForMovie: true } });
    expect(mockPost).toHaveBeenCalledWith('/api/v3/movie', expect.objectContaining({ tmdbId: 789 }));
  });

  test('getCredits fetches cast', async () => {
    mockGet.mockResolvedValue({ data: [{ personName: 'Actor', type: 'cast' }] });
    const credits = await adapter.getCredits(1);
    expect(mockGet).toHaveBeenCalledWith('/api/v3/credit', { params: { movieId: 1 } });
    expect(credits[0].personName).toBe('Actor');
  });

  test('deleteMovie with exclusion', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    await adapter.deleteMovie(1, true, true);
    expect(mockDelete).toHaveBeenCalledWith('/api/v3/movie/1', { params: { deleteFiles: true, addImportExclusion: true } });
  });
});
