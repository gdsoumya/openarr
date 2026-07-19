export interface Movie {
  id: number; title: string; sortTitle: string; status: 'tba' | 'announced' | 'inCinemas' | 'released' | 'deleted';
  overview: string; year: number; path: string; qualityProfileId: number; monitored: boolean;
  tmdbId: number; imdbId?: string; hasFile: boolean; isAvailable: boolean; sizeOnDisk: number;
  runtime: number; images: Array<{ coverType: string; remoteUrl: string }>; genres: string[];
  ratings: { tmdb: { value: number } }; tags: number[]; added: string;
  inCinemas?: string; digitalRelease?: string; physicalRelease?: string;
  minimumAvailability: 'announced' | 'inCinemas' | 'released' | 'preDB';
  movieFile?: MovieFile; collection?: { tmdbId: number; title: string };
}

export interface MovieFile {
  id: number; movieId: number; path: string; size: number; dateAdded?: string;
  quality: { quality: { name: string; resolution: number } };
  mediaInfo?: { videoCodec: string; audioCodec: string; audioChannels: number; resolution: string; videoDynamicRangeType: string };
  languages: Array<{ name: string }>;
}

export interface Collection { id: number; title: string; tmdbId: number; monitored: boolean; movies: Movie[]; images: Array<{ coverType: string; remoteUrl: string }>; }
export interface Credit { personName: string; character?: string; department?: string; job?: string; type: 'cast' | 'crew'; images: Array<{ coverType: string; remoteUrl: string }>; }

export interface AddMovieConfig {
  tmdbId: number; title: string; qualityProfileId: number; rootFolderPath: string;
  monitored: boolean; minimumAvailability: 'announced' | 'inCinemas' | 'released' | 'preDB';
  tags: number[]; addOptions: { searchForMovie: boolean };
}
