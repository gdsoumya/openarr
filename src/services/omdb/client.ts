import axios, { AxiosInstance } from 'axios';

export interface OMDBRatings {
  imdbRating: string;    // e.g. "8.7"
  imdbVotes: string;     // e.g. "1,234,567"
  rottenTomatoesCritic?: string;  // e.g. "95%"
  rottenTomatoesAudience?: string; // e.g. "88%"
  metacritic?: string;   // e.g. "85"
  rated?: string;        // e.g. "PG-13", "TV-MA"
  awards?: string;
}

export class OMDBClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://www.omdbapi.com',
      timeout: 10000,
      params: { apikey: apiKey },
    });
  }

  async getByTitle(title: string, year?: string): Promise<OMDBRatings | null> {
    try {
      const params: any = { t: title, plot: 'short' };
      if (year) params.y = year;
      const { data } = await this.client.get('/', { params });
      if (data.Response === 'False') return null;
      return this.parseResponse(data);
    } catch {
      return null;
    }
  }

  async getByImdbId(imdbId: string): Promise<OMDBRatings | null> {
    try {
      const { data } = await this.client.get('/', { params: { i: imdbId, plot: 'short' } });
      if (data.Response === 'False') return null;
      return this.parseResponse(data);
    } catch {
      return null;
    }
  }

  private parseResponse(data: any): OMDBRatings {
    const ratings: OMDBRatings = {
      imdbRating: data.imdbRating ?? 'N/A',
      imdbVotes: data.imdbVotes ?? '',
      rated: data.Rated,
      awards: data.Awards !== 'N/A' ? data.Awards : undefined,
    };

    if (data.Ratings && Array.isArray(data.Ratings)) {
      for (const r of data.Ratings) {
        if (r.Source === 'Rotten Tomatoes') {
          ratings.rottenTomatoesCritic = r.Value;
        }
        if (r.Source === 'Metacritic') {
          ratings.metacritic = r.Value;
        }
      }
    }

    return ratings;
  }
}
