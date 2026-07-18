export interface SubtitleInfo { code2: string; name: string; forced: boolean; hi: boolean; path?: string; }

export interface EpisodeSubtitles {
  sonarrEpisodeId: number; sonarrSeriesId: number; title: string; season: number; episode: number;
  subtitles: SubtitleInfo[]; missing_subtitles: SubtitleInfo[]; sceneName?: string;
  // wanted-list rows use these instead of season/episode
  seriesTitle?: string; episodeTitle?: string; episode_number?: string;
}

export interface MovieSubtitles {
  radarrId: number; title: string; subtitles: SubtitleInfo[]; missing_subtitles: SubtitleInfo[]; sceneName?: string;
}

export interface SeriesItem {
  sonarrSeriesId: number; title: string; episodeFileCount: number; episodeMissingCount: number;
  profileId: number | null; badges?: unknown;
}

// Bazarr marshals booleans as "True"/"False" strings on this endpoint
export interface SubtitleSearchResult {
  provider: string; release_info: string[]; score: number; orig_score?: number; language: string;
  forced: string; hearing_impaired: string; original_format: string;
  uploader?: string; url?: string; matches: string[]; dont_matches: string[]; subtitle: string;
}

export interface HistoryLanguage { code2: string; name: string; forced?: boolean; hi?: boolean; }

export interface SubHistoryItem {
  id: number; action: number; provider: string; score: string | number | null;
  language: HistoryLanguage | null; description: string; upgradable: boolean; blacklisted: boolean;
  timestamp: string; raw_timestamp?: number; parsed_timestamp?: string;
  subs_id?: string; subtitles_path?: string;
  // episode history
  seriesTitle?: string; episode_number?: string; episodeTitle?: string;
  sonarrSeriesId?: number; sonarrEpisodeId?: number;
  // movie history
  title?: string; radarrId?: number;
}

export interface BlacklistItem {
  provider: string; subs_id: string; language: HistoryLanguage | null; timestamp: string;
  parsed_timestamp?: string; subtitles_path?: string;
  seriesTitle?: string; episode_number?: string; episodeTitle?: string; sonarrSeriesId?: number; sonarrEpisodeId?: number;
  title?: string; radarrId?: number;
}

export interface ProviderInfo { name: string; status: string; retry?: string; }
export interface Badges { episodes: number; movies: number; providers: number; status: number; }
export interface LanguageProfile { profileId: number; name: string; items: Array<{ id: number; language: string; hi: string; forced: string }>; }

export interface SubtitleActionParams {
  action: 'sync' | 'translate';
  language: string;
  path: string;
  type: 'episode' | 'movie';
  id: number;
  forced?: boolean;
  hi?: boolean;
}
