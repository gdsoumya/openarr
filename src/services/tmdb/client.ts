import axios, { AxiosInstance } from 'axios';
import { TMDBShow, TMDBMovie, TMDBExternalIds, TMDBCredits } from './types';

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
  async searchTV(query: string): Promise<TMDBShow[]> { const { data } = await this.client.get('/search/tv', { params: { query } }); return data.results; }
  async searchMovies(query: string): Promise<TMDBMovie[]> { const { data } = await this.client.get('/search/movie', { params: { query } }); return data.results; }

  async getShowDetails(id: number): Promise<TMDBShow & { number_of_seasons: number; status: string }> { const { data } = await this.client.get(`/tv/${id}`); return data; }
  async getMovieDetails(id: number): Promise<TMDBMovie & { runtime: number; budget: number; revenue: number; genres: any[] }> { const { data } = await this.client.get(`/movie/${id}`); return data; }
  async getShowExternalIds(id: number): Promise<TMDBExternalIds> { const { data } = await this.client.get(`/tv/${id}/external_ids`); return data; }
  async getShowCredits(id: number): Promise<TMDBCredits> { const { data } = await this.client.get(`/tv/${id}/credits`); return data; }
  async getMovieCredits(id: number): Promise<TMDBCredits> { const { data } = await this.client.get(`/movie/${id}/credits`); return data; }
}
