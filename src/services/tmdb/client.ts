import axios, { AxiosInstance } from 'axios';
import {
  TMDBShow, TMDBMovie, TMDBExternalIds, TMDBCredits, WatchProviders,
  PagedResponse, TMDBGenre, TMDBVideo, TMDBPerson, TMDBPersonCredit, TMDBCollection,
  DiscoverFilters, WatchProvider,
} from './types';

function toDiscoverParams(f: DiscoverFilters, mediaType: 'movie' | 'tv'): Record<string, any> {
  const dateKey = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
  const params: Record<string, any> = {
    sort_by: f.sortBy ?? 'popularity.desc',
    include_adult: false,
    'vote_count.gte': f.minVotes ?? 50,
  };
  if (f.genreIds?.length) params.with_genres = f.genreIds.join('|');
  if (f.yearFrom) params[`${dateKey}.gte`] = `${f.yearFrom}-01-01`;
  if (f.yearTo) params[`${dateKey}.lte`] = `${f.yearTo}-12-31`;
  if (f.minRating) params['vote_average.gte'] = f.minRating;
  if (f.keywordIds?.length) params.with_keywords = f.keywordIds.join('|');
  if (f.watchProviderIds?.length) {
    params.with_watch_providers = f.watchProviderIds.join('|');
    params.watch_region = f.region ?? 'US';
  }
  return params;
}

export class TMDBClient {
  private client: AxiosInstance;

  constructor(readAccessToken: string) {
    this.client = this.build(readAccessToken);
  }

  private build(token: string): AxiosInstance {
    return axios.create({
      baseURL: 'https://api.themoviedb.org/3',
      timeout: 10000,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  setToken(token: string): void {
    this.client = this.build(token);
  }

  private async paged<T>(url: string, params?: Record<string, any>): Promise<PagedResponse<T>> {
    const { data } = await this.client.get(url, { params });
    return data;
  }

  async getTrendingShows(page = 1): Promise<TMDBShow[]> { return (await this.paged<TMDBShow>('/trending/tv/week', { page })).results; }
  async getTrendingMovies(page = 1): Promise<TMDBMovie[]> { return (await this.paged<TMDBMovie>('/trending/movie/week', { page })).results; }
  async getOnTheAirShows(page = 1): Promise<TMDBShow[]> { return (await this.paged<TMDBShow>('/tv/on_the_air', { page })).results; }
  async getNowPlayingMovies(page = 1): Promise<TMDBMovie[]> { return (await this.paged<TMDBMovie>('/movie/now_playing', { page })).results; }
  async getUpcomingMovies(page = 1): Promise<TMDBMovie[]> { return (await this.paged<TMDBMovie>('/movie/upcoming', { page })).results; }
  async getPopularMovies(page = 1): Promise<PagedResponse<TMDBMovie>> { return this.paged('/movie/popular', { page }); }
  async getPopularShows(page = 1): Promise<PagedResponse<TMDBShow>> { return this.paged('/tv/popular', { page }); }
  async getTopRatedMovies(page = 1): Promise<PagedResponse<TMDBMovie>> { return this.paged('/movie/top_rated', { page }); }
  async getTopRatedShows(page = 1): Promise<PagedResponse<TMDBShow>> { return this.paged('/tv/top_rated', { page }); }

  async discoverMovies(filters: DiscoverFilters, page = 1): Promise<PagedResponse<TMDBMovie>> {
    return this.paged('/discover/movie', { ...toDiscoverParams(filters, 'movie'), page });
  }

  async discoverShows(filters: DiscoverFilters, page = 1): Promise<PagedResponse<TMDBShow>> {
    return this.paged('/discover/tv', { ...toDiscoverParams(filters, 'tv'), page });
  }

  async getMovieRecommendations(id: number, page = 1): Promise<PagedResponse<TMDBMovie>> { return this.paged(`/movie/${id}/recommendations`, { page }); }
  async getShowRecommendations(id: number, page = 1): Promise<PagedResponse<TMDBShow>> { return this.paged(`/tv/${id}/recommendations`, { page }); }
  async getSimilarMovies(id: number, page = 1): Promise<PagedResponse<TMDBMovie>> { return this.paged(`/movie/${id}/similar`, { page }); }
  async getSimilarShows(id: number, page = 1): Promise<PagedResponse<TMDBShow>> { return this.paged(`/tv/${id}/similar`, { page }); }

  async getMovieVideos(id: number): Promise<TMDBVideo[]> { const { data } = await this.client.get(`/movie/${id}/videos`); return data.results ?? []; }
  async getShowVideos(id: number): Promise<TMDBVideo[]> { const { data } = await this.client.get(`/tv/${id}/videos`); return data.results ?? []; }

  private genreCache = new Map<string, TMDBGenre[]>();

  async getGenres(mediaType: 'movie' | 'tv'): Promise<TMDBGenre[]> {
    const cached = this.genreCache.get(mediaType);
    if (cached) return cached;
    const { data } = await this.client.get(`/genre/${mediaType}/list`);
    this.genreCache.set(mediaType, data.genres ?? []);
    return data.genres ?? [];
  }

  async getCollection(id: number): Promise<TMDBCollection> { const { data } = await this.client.get(`/collection/${id}`); return data; }
  async getPerson(id: number): Promise<TMDBPerson> { const { data } = await this.client.get(`/person/${id}`); return data; }

  async getPersonCombinedCredits(id: number): Promise<TMDBPersonCredit[]> {
    const { data } = await this.client.get(`/person/${id}/combined_credits`);
    return [...(data.cast ?? []), ...(data.crew ?? [])];
  }

  async searchPeople(query: string, page = 1): Promise<PagedResponse<TMDBPerson>> {
    return this.paged('/search/person', { query, page, include_adult: false });
  }

  async getWatchProviderList(mediaType: 'movie' | 'tv', region: string): Promise<WatchProvider[]> {
    const { data } = await this.client.get(`/watch/providers/${mediaType}`, { params: { watch_region: region } });
    return data.results ?? [];
  }
  async searchTV(query: string, pages = 3): Promise<{ results: TMDBShow[]; totalResults: number }> {
    const firstPage = await this.client.get('/search/tv', { params: { query, page: 1, include_adult: false } });
    const totalPages = Math.min(pages, firstPage.data.total_pages ?? 1);
    let results: TMDBShow[] = firstPage.data.results;

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          this.client.get('/search/tv', { params: { query, page: i + 2, include_adult: false } }).catch(() => ({ data: { results: [] } }))
        )
      );
      for (const r of remaining) results = results.concat(r.data.results);
    }

    return { results, totalResults: firstPage.data.total_results };
  }

  async searchMovies(query: string, pages = 3): Promise<{ results: TMDBMovie[]; totalResults: number }> {
    const firstPage = await this.client.get('/search/movie', { params: { query, page: 1, include_adult: false } });
    const totalPages = Math.min(pages, firstPage.data.total_pages ?? 1);
    let results: TMDBMovie[] = firstPage.data.results;

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          this.client.get('/search/movie', { params: { query, page: i + 2, include_adult: false } }).catch(() => ({ data: { results: [] } }))
        )
      );
      for (const r of remaining) results = results.concat(r.data.results);
    }

    return { results, totalResults: firstPage.data.total_results };
  }

  async searchMulti(query: string, page = 1): Promise<{ results: Array<(TMDBShow | TMDBMovie) & { media_type: 'tv' | 'movie' }>; totalResults: number }> {
    const { data } = await this.client.get('/search/multi', { params: { query, page, include_adult: false } });
    // Filter to only tv and movie results (exclude person etc.)
    const filtered = data.results.filter((r: any) => r.media_type === 'tv' || r.media_type === 'movie');
    return { results: filtered, totalResults: data.total_results };
  }

  async findByExternalId(externalId: string, source: 'imdb_id' | 'tvdb_id'): Promise<{ tv_results: TMDBShow[]; movie_results: TMDBMovie[] }> {
    const { data } = await this.client.get(`/find/${externalId}`, { params: { external_source: source } });
    return { tv_results: data.tv_results ?? [], movie_results: data.movie_results ?? [] };
  }

  async getShowDetails(id: number): Promise<TMDBShow & { number_of_seasons: number; status: string }> { const { data } = await this.client.get(`/tv/${id}`); return data; }
  async getMovieDetails(id: number): Promise<TMDBMovie & { runtime: number; budget: number; revenue: number; genres: any[] }> { const { data } = await this.client.get(`/movie/${id}`); return data; }
  async getShowExternalIds(id: number): Promise<TMDBExternalIds> { const { data } = await this.client.get(`/tv/${id}/external_ids`); return data; }
  async getShowCredits(id: number): Promise<TMDBCredits> { const { data } = await this.client.get(`/tv/${id}/credits`); return data; }
  async getMovieCredits(id: number): Promise<TMDBCredits> { const { data } = await this.client.get(`/movie/${id}/credits`); return data; }

  async getMovieWatchProviders(id: number): Promise<WatchProviders> {
    const { data } = await this.client.get(`/movie/${id}/watch/providers`);
    return data.results ?? {};
  }

  async getTVWatchProviders(id: number): Promise<WatchProviders> {
    const { data } = await this.client.get(`/tv/${id}/watch/providers`);
    return data.results ?? {};
  }
}
