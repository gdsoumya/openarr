export interface SubtitleInfo { code2: string; name: string; forced: boolean; hi: boolean; path?: string; }

export interface EpisodeSubtitles {
  sonarrEpisodeId: number; sonarrSeriesId: number; title: string; season: number; episode: number;
  subtitles: SubtitleInfo[]; missing_subtitles: SubtitleInfo[]; sceneName?: string;
}

export interface MovieSubtitles {
  radarrId: number; title: string; subtitles: SubtitleInfo[]; missing_subtitles: SubtitleInfo[]; sceneName?: string;
}

export interface SubtitleSearchResult {
  provider: string; release_info: string[]; score: number; language: string;
  hi: boolean; forced: boolean; hearing_impaired: boolean; original_format: boolean;
  uploader?: string; matches: string[]; dont_matches: string[]; subtitle: string;
}

export interface SubHistoryItem {
  id: number; action: number; timestamp: string; provider: string; language: string;
  score: string; description: string; upgradable: boolean; blacklisted: boolean;
}

export interface ProviderInfo { name: string; status: 'active' | 'throttled'; retry?: string; }
export interface Badges { episodes: number; movies: number; providers: number; status: number; }
export interface LanguageProfile { profileId: number; name: string; items: Array<{ id: number; language: string; hi: boolean; forced: boolean }>; }
