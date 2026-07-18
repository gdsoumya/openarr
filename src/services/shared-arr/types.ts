export interface QualityProfile { id: number; name: string; }
export interface RootFolder { id: number; path: string; freeSpace: number; }
export interface Tag { id: number; label: string; }

export interface QueueItem {
  id: number; title: string; status: string; size: number; sizeleft: number;
  timeleft: string; estimatedCompletionTime: string; downloadClient: string; outputPath: string;
}

export interface HistoryItem {
  id: number; date: string; eventType: string; sourceTitle: string;
  quality: { quality: { name: string } };
}

export interface CalendarItem {
  id: number; title: string; airDateUtc?: string; inCinemas?: string;
  digitalRelease?: string; hasFile: boolean; monitored: boolean;
}

export interface ReleaseLanguage { id: number; name: string; }
export interface ReleaseCustomFormat { id: number; name: string; }
export interface ReleaseQuality {
  quality: { id?: number; name: string; source?: string; resolution?: number };
  revision?: { version: number; real: number; isRepack?: boolean };
}

export interface Release {
  guid: string; title: string; indexer: string; size: number; age: number; ageHours: number;
  ageMinutes?: number; publishDate?: string;
  quality: ReleaseQuality; qualityWeight?: number;
  customFormats?: ReleaseCustomFormat[]; customFormatScore?: number;
  languages?: ReleaseLanguage[];
  // Sonarr sends a bitmask int, Radarr can send string[] — normalize via releaseUtils
  indexerFlags?: number | string[];
  seeders?: number; leechers?: number;
  rejected: boolean; rejections?: string[]; indexerId: number; protocol: string;
  fullSeason?: boolean; seasonNumber?: number;
  mappedSeriesId?: number; infoUrl?: string;
}

export interface AddItemConfig {
  rootFolderPath: string; qualityProfileId: number; monitored: boolean; tags: number[];
}
