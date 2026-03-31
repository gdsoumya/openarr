export interface Series {
  id: number; title: string; sortTitle: string; status: 'continuing' | 'ended' | 'upcoming' | 'deleted';
  overview: string; network: string; year: number; path: string; qualityProfileId: number;
  seriesType: 'standard' | 'daily' | 'anime'; monitored: boolean; tvdbId: number; imdbId?: string;
  seasonCount: number; totalEpisodeCount: number; episodeCount: number; episodeFileCount: number;
  sizeOnDisk: number; images: Array<{ coverType: string; remoteUrl: string }>; seasons: Season[];
  tags: number[]; added: string; firstAired?: string; runtime: number;
  statistics: { episodeFileCount: number; episodeCount: number; totalEpisodeCount: number; sizeOnDisk: number; percentOfEpisodes: number };
}

export interface Season {
  seasonNumber: number; monitored: boolean;
  statistics?: { episodeFileCount: number; episodeCount: number; totalEpisodeCount: number; sizeOnDisk: number; percentOfEpisodes: number };
}

export interface Episode {
  id: number; seriesId: number; seasonNumber: number; episodeNumber: number; title: string;
  airDateUtc?: string; overview?: string; hasFile: boolean; monitored: boolean;
  episodeFileId?: number; episodeFile?: EpisodeFile;
}

export interface EpisodeFile {
  id: number; seriesId: number; seasonNumber: number; path: string; size: number;
  quality: { quality: { name: string } }; language: { name: string };
}

export type MonitoringPreset = 'all' | 'future' | 'missing' | 'existing' | 'firstSeason' | 'latestSeason' | 'pilot' | 'recent' | 'monitorSpecials' | 'unmonitorSpecials' | 'none';

export interface AddSeriesConfig {
  tvdbId: number; title: string; qualityProfileId: number; rootFolderPath: string;
  seriesType: 'standard' | 'daily' | 'anime'; monitored: boolean; tags: number[];
  addOptions: { monitor: MonitoringPreset; searchForMissingEpisodes: boolean };
}
