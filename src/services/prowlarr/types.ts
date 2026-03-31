export interface SearchResult {
  guid: string; title: string; sortTitle: string; size: number; publishDate: string;
  age: number; ageHours: number; indexer: string; indexerId: number;
  seeders?: number; leechers?: number; protocol: 'torrent' | 'usenet';
  categories: Array<{ id: number; name: string }>; downloadUrl: string;
  infoUrl?: string; imdbId?: number; tmdbId?: number; tvdbId?: number;
}

export type SearchType = 'search' | 'tvsearch' | 'moviesearch' | 'audiosearch';

export interface Indexer { id: number; name: string; protocol: 'torrent' | 'usenet'; enable: boolean; priority: number; appProfileId: number; tags: number[]; }
export interface IndexerStatus { indexerId: number; disabledTill?: string; mostRecentFailure?: string; }
export interface IndexerStats { indexerId: number; indexerName: string; numberOfQueries: number; numberOfGrabs: number; numberOfFailedQueries: number; numberOfFailedGrabs: number; }
export interface SearchHistoryItem { id: number; date: string; eventType: string; data: Record<string, string>; successful: boolean; indexerId: number; }
