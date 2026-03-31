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

  async getByImdbId(imdbId: string): Promise<OMDBRatings | null> {
    try {
      const { data } = await this.client.get('/', { params: { i: imdbId, plot: 'short' } });
      if (data.Response === 'False') return null;

      const ratings: OMDBRatings = {
        imdbRating: data.imdbRating ?? 'N/A',
        imdbVotes: data.imdbVotes ?? '',
        rated: data.Rated,
        awards: data.Awards !== 'N/A' ? data.Awards : undefined,
      };

      // Extract Rotten Tomatoes ratings
      if (data.Ratings && Array.isArray(data.Ratings)) {
        for (const r of data.Ratings) {
          if (r.Source === 'Rotten Tomatoes') {
            ratings.rottenTomatoesCritic = r.Value; // e.g. "95%"
          }
          if (r.Source === 'Metacritic') {
            ratings.metacritic = r.Value; // e.g. "85/100"
          }
        }
      }

      // RT audience score isn't in OMDB directly, but we have the critic score
      return ratings;
    } catch {
      return null;
    }
  }
}
