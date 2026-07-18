import { TMDBClient } from './client';

const mockGet = jest.fn();
jest.mock('axios', () => ({ __esModule: true, default: { create: () => ({ get: mockGet }) } }));

describe('TMDBClient', () => {
  let client: TMDBClient;
  beforeEach(() => { mockGet.mockReset(); client = new TMDBClient('fake-key'); });

  test('getTrendingShows', async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, name: 'Show' }] } });
    const shows = await client.getTrendingShows();
    expect(mockGet).toHaveBeenCalledWith('/trending/tv/week', { params: { page: 1 } });
    expect(shows[0].name).toBe('Show');
  });

  test('discoverMovies maps filters to TMDB params', async () => {
    mockGet.mockResolvedValue({ data: { page: 1, results: [], total_pages: 1, total_results: 0 } });
    await client.discoverMovies({
      genreIds: [28, 878], yearFrom: 2020, yearTo: 2024, minRating: 7,
      watchProviderIds: [8], region: 'IN', sortBy: 'vote_average.desc',
    }, 2);
    expect(mockGet).toHaveBeenCalledWith('/discover/movie', {
      params: expect.objectContaining({
        with_genres: '28|878',
        'primary_release_date.gte': '2020-01-01',
        'primary_release_date.lte': '2024-12-31',
        'vote_average.gte': 7,
        with_watch_providers: '8',
        watch_region: 'IN',
        sort_by: 'vote_average.desc',
        page: 2,
      }),
    });
  });

  test('discoverShows uses first_air_date params and defaults', async () => {
    mockGet.mockResolvedValue({ data: { page: 1, results: [], total_pages: 1, total_results: 0 } });
    await client.discoverShows({ yearFrom: 2022 });
    expect(mockGet).toHaveBeenCalledWith('/discover/tv', {
      params: expect.objectContaining({
        'first_air_date.gte': '2022-01-01',
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
      }),
    });
  });

  test('getGenres caches per media type', async () => {
    mockGet.mockResolvedValue({ data: { genres: [{ id: 28, name: 'Action' }] } });
    await client.getGenres('movie');
    await client.getGenres('movie');
    expect(mockGet).toHaveBeenCalledTimes(1);
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
