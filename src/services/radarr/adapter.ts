import { ArrServiceAdapter } from '../shared-arr/adapter';
import { ServiceConfig, ServiceStatus } from '../../core/types/services';
import { PaginatedResult } from '../../core/types/common';
import { Movie, MovieFile, Collection, Credit, AddMovieConfig } from './types';

export class RadarrAdapter extends ArrServiceAdapter {
  readonly id = 'radarr' as const;
  constructor(config: ServiceConfig, isLocal: boolean) { super(config, isLocal); }

  async getStatus(): Promise<ServiceStatus> {
    try {
      const [movies, queue] = await Promise.all([this.getMovies(), this.getQueue(1, 1)]);
      const dl = queue.totalRecords;
      return { serviceId: 'radarr', connection: { status: 'connected', isLocal: true, lastChecked: Date.now() },
        summary: dl > 0 ? `${dl} downloading` : `${movies.length} movies`, metric: { value: movies.length, label: 'movies' } };
    } catch (e: any) {
      return { serviceId: 'radarr', connection: { status: 'error', isLocal: true, lastChecked: Date.now(), error: e.message }, summary: 'Connection failed' };
    }
  }

  async getMovies(): Promise<Movie[]> { const { data } = await this.client.get('/api/v3/movie'); return data; }
  async getMovieById(id: number): Promise<Movie> { const { data } = await this.client.get(`/api/v3/movie/${id}`); return data; }
  async lookupMovie(term: string): Promise<Movie[]> { const { data } = await this.client.get('/api/v3/movie/lookup', { params: { term } }); return data; }
  async addMovie(config: AddMovieConfig): Promise<Movie> { const { data } = await this.client.post('/api/v3/movie', config); return data; }
  async editMovie(movie: Movie): Promise<Movie> { const { data } = await this.client.put(`/api/v3/movie/${movie.id}`, movie); return data; }
  async deleteMovie(id: number, deleteFiles: boolean, addImportExclusion = false): Promise<void> { await this.client.delete(`/api/v3/movie/${id}`, { params: { deleteFiles, addImportExclusion } }); }

  async getMovieFile(id: number): Promise<MovieFile> { const { data } = await this.client.get(`/api/v3/moviefile/${id}`); return data; }
  async deleteMovieFile(id: number): Promise<void> { await this.client.delete(`/api/v3/moviefile/${id}`); }
  async getCredits(movieId: number): Promise<Credit[]> { const { data } = await this.client.get('/api/v3/credit', { params: { movieId } }); return data; }
  async getCollections(): Promise<Collection[]> { const { data } = await this.client.get('/api/v3/collection'); return data; }

  async getWantedMissing(page = 1, pageSize = 20): Promise<PaginatedResult<Movie>> {
    const { data } = await this.client.get('/api/v3/wanted/missing', { params: { page, pageSize, sortKey: 'digitalRelease', sortDirection: 'descending' } });
    return data;
  }

  async searchMovie(movieId: number): Promise<void> { await this.executeCommand('MoviesSearch', { movieIds: [movieId] }); }
  async manualSearchMovie(movieId: number): Promise<any[]> { return this.manualSearch({ movieId }); }
  getTmdbIds(movies: Movie[]): number[] { return movies.map(m => m.tmdbId); }
}
