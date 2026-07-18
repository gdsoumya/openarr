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

export interface PagedResponse<T> { page: number; results: T[]; total_pages: number; total_results: number; }

export interface TMDBGenre { id: number; name: string; }

export interface TMDBVideo { id: string; key: string; site: string; type: string; name: string; official?: boolean; }

export interface TMDBPerson {
  id: number; name: string; profile_path: string | null; known_for_department?: string;
  biography?: string; birthday?: string | null; place_of_birth?: string | null; popularity?: number;
}

export interface TMDBPersonCredit {
  id: number; media_type: 'movie' | 'tv'; title?: string; name?: string;
  poster_path: string | null; release_date?: string; first_air_date?: string;
  vote_average?: number; popularity?: number; character?: string; job?: string;
}

export interface TMDBCollection {
  id: number; name: string; overview?: string; poster_path: string | null;
  parts: TMDBMovie[];
}

export interface DiscoverFilters {
  // 'client:imdb' / 'client:rt' rank loaded results by external ratings app-side
  sortBy?: string;
  genreIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  minVotes?: number;
  watchProviderIds?: number[];
  region?: string;
  keywordIds?: number[];
  originalLanguage?: string;
  originCountry?: string;
  networkIds?: number[];
  runtimeFrom?: number;
  runtimeTo?: number;
  // Client-side minimums applied to loaded results via the external ratings cache
  minImdb?: number;
  minRt?: number;
}

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

export function profileUrl(path: string | null, size: 'w185' | 'w342' = 'w185'): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
