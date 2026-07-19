import { colors } from '../../core/theme/tokens';
import { Release } from './types';

export type ReleaseSortKey = 'cfScore' | 'seeders' | 'age' | 'size' | 'quality';

export type QualityTier = '2160p' | '1080p' | '720p' | 'sd';

export interface ReleaseFilters {
  protocol: 'all' | 'torrent' | 'usenet';
  qualityTier: 'all' | QualityTier;
  approvedOnly: boolean;
  seasonPacksOnly: boolean;
}

export const defaultReleaseFilters: ReleaseFilters = {
  protocol: 'all',
  qualityTier: 'all',
  approvedOnly: false,
  seasonPacksOnly: false,
};

type SortableRelease = Pick<Release, 'guid' | 'size' | 'age' | 'ageHours' | 'seeders' | 'protocol'> &
  Partial<Pick<Release, 'quality' | 'qualityWeight' | 'customFormatScore' | 'rejected' | 'fullSeason' | 'ageMinutes'>>;

const SOURCE_RANK: Record<string, number> = {
  bluray: 6, blurayraw: 6, web: 5, webdl: 5, webrip: 4, hdtv: 3, television: 3, dvd: 2, sdtv: 1,
};

function resolutionOf(r: SortableRelease): number {
  const q = r.quality?.quality;
  if (q?.resolution) return q.resolution;
  const name = q?.name ?? '';
  const m = name.match(/(\d{3,4})p/i);
  if (m) return parseInt(m[1], 10);
  if (/2160|4k/i.test(name)) return 2160;
  return 480;
}

export function qualityRank(r: SortableRelease): number {
  if (r.qualityWeight != null) return r.qualityWeight;
  const source = (r.quality?.quality?.source ?? '').toLowerCase();
  return resolutionOf(r) * 10 + (SOURCE_RANK[source] ?? 0);
}

export function qualityTier(r: SortableRelease): QualityTier {
  const res = resolutionOf(r);
  if (res >= 2160) return '2160p';
  if (res >= 1080) return '1080p';
  if (res >= 720) return '720p';
  return 'sd';
}

export function sortReleases<T extends SortableRelease>(releases: T[], sortBy: ReleaseSortKey | null): T[] {
  const sorted = [...releases];
  switch (sortBy) {
    case 'cfScore': sorted.sort((a, b) => (b.customFormatScore ?? 0) - (a.customFormatScore ?? 0)); break;
    case 'seeders': sorted.sort((a, b) => (b.seeders ?? -1) - (a.seeders ?? -1)); break;
    case 'age': sorted.sort((a, b) => a.ageHours - b.ageHours); break;
    case 'size': sorted.sort((a, b) => b.size - a.size); break;
    case 'quality': sorted.sort((a, b) => qualityRank(b) - qualityRank(a)); break;
  }
  // Rejected releases always sink below approved ones (stable within groups)
  sorted.sort((a, b) => (a.rejected ? 1 : 0) - (b.rejected ? 1 : 0));
  return sorted;
}

export function filterReleases<T extends SortableRelease>(releases: T[], filters: ReleaseFilters): T[] {
  return releases.filter((r) => {
    if (filters.protocol !== 'all' && r.protocol !== filters.protocol) return false;
    if (filters.qualityTier !== 'all' && qualityTier(r) !== filters.qualityTier) return false;
    if (filters.approvedOnly && r.rejected) return false;
    if (filters.seasonPacksOnly && !r.fullSeason) return false;
    return true;
  });
}

// Common Sonarr/Radarr bitmask values; exact semantics vary slightly per app,
// but the low bits (freeleech family) are consistent enough for display.
const FLAG_BITS: Array<[number, string]> = [
  [1, 'Freeleech'], [2, 'Halfleech'], [4, 'Double Upload'], [8, 'Internal'],
  [16, 'Scene'], [32, 'Freeleech 75'], [64, 'Freeleech 25'], [128, 'Nuked'],
];

export function normalizeIndexerFlags(flags?: number | string[]): string[] {
  if (!flags) return [];
  if (Array.isArray(flags)) {
    return flags.map((f) => f.replace(/^g_/i, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  }
  return FLAG_BITS.filter(([bit]) => (flags & bit) !== 0).map(([, label]) => label);
}

export function formatReleaseAge(r: Pick<Release, 'age' | 'ageHours'> & { ageMinutes?: number }): string {
  if (r.ageHours < 1 && r.ageMinutes != null) return `${Math.max(1, Math.round(r.ageMinutes))}m`;
  if (r.ageHours < 24) return `${Math.max(1, Math.round(r.ageHours))}h`;
  if (r.age < 365) return `${Math.round(r.age)}d`;
  return `${(r.age / 365).toFixed(1)}y`;
}

export { formatBytes as formatSize } from '../../core/utils/format';

export function peerHealthColor(seeders?: number): string {
  if (seeders === undefined) return colors.textMuted;
  if (seeders === 0) return colors.error;
  if (seeders < 10) return colors.warning;
  return colors.success;
}

export function cfScoreTone(score?: number): 'positive' | 'neutral' | 'negative' {
  if (!score) return 'neutral';
  return score > 0 ? 'positive' : 'negative';
}

export function qualityTierColor(tier: QualityTier): string {
  switch (tier) {
    case '2160p': return colors.radarr;
    case '1080p': return colors.primary;
    case '720p': return colors.info;
    case 'sd': return colors.textMuted;
  }
}
