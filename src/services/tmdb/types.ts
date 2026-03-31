export interface TMDBShow {
  id: number; name: string; overview: string; first_air_date: string; vote_average: number;
  poster_path: string | null; backdrop_path: string | null; genre_ids?: number[];
  origin_country: string[]; original_language: string; popularity: number;
}

export interface TMDBMovie {
  id: number; title: string; overview: string; release_date: string; vote_average: number;
  poster_path: string | null; backdrop_path: string | null; genre_ids?: number[];
  original_language: string; popularity: number; runtime?: number;
}

export interface TMDBExternalIds { tvdb_id?: number; imdb_id?: string; }

export interface TMDBCredits {
  cast: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>;
  crew: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviderCountry {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export type WatchProviders = Record<string, WatchProviderCountry>;

export function posterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function backdropUrl(path: string | null, size: 'w780' | 'w1280' | 'original' = 'w780'): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
