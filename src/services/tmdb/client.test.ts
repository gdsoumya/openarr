import { TMDBClient } from './client';

const mockGet = jest.fn();
jest.mock('axios', () => ({ __esModule: true, default: { create: () => ({ get: mockGet }) } }));

describe('TMDBClient', () => {
  let client: TMDBClient;
  beforeEach(() => { mockGet.mockReset(); client = new TMDBClient('fake-key'); });

  test('getTrendingShows', async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, name: 'Show' }] } });
    const shows = await client.getTrendingShows();
    expect(mockGet).toHaveBeenCalledWith('/trending/tv/week');
    expect(shows[0].name).toBe('Show');
  });

  test('getTrendingMovies', async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, title: 'Movie' }] } });
    const movies = await client.getTrendingMovies();
    expect(movies[0].title).toBe('Movie');
  });

  test('getShowExternalIds', async () => {
    mockGet.mockResolvedValue({ data: { tvdb_id: 123 } });
    const ids = await client.getShowExternalIds(1);
    expect(ids.tvdb_id).toBe(123);
  });
});
