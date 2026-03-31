import axios, { AxiosInstance } from 'axios';
import { TMDBShow, TMDBMovie, TMDBExternalIds, TMDBCredits, WatchProviders } from './types';

export class TMDBClient {
  private client: AxiosInstance;

  constructor(readAccessToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.themoviedb.org/3',
      timeout: 10000,
      headers: { Authorization: `Bearer ${readAccessToken}` },
    });
  }

  async getTrendingShows(): Promise<TMDBShow[]> { const { data } = await this.client.get('/trending/tv/week'); return data.results; }
  async getTrendingMovies(): Promise<TMDBMovie[]> { const { data } = await this.client.get('/trending/movie/week'); return data.results; }
  async getOnTheAirShows(): Promise<TMDBShow[]> { const { data } = await this.client.get('/tv/on_the_air'); return data.results; }
  async getNowPlayingMovies(): Promise<TMDBMovie[]> { const { data } = await this.client.get('/movie/now_playing'); return data.results; }
  async getUpcomingMovies(): Promise<TMDBMovie[]> { const { data } = await this.client.get('/movie/upcoming'); return data.results; }
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
