import {
  cfScoreTone, defaultReleaseFilters, filterReleases, formatReleaseAge, formatSize,
  normalizeIndexerFlags, peerHealthColor, qualityRank, qualityTier, sortReleases,
} from './releaseUtils';
import { Release } from './types';

function release(overrides: Partial<Release>): Release {
  return {
    guid: Math.random().toString(36).slice(2), title: 'Test', indexer: 'Idx', size: 1000,
    age: 1, ageHours: 24, quality: { quality: { name: 'HDTV-720p', resolution: 720 } },
    rejected: false, indexerId: 1, protocol: 'torrent',
    ...overrides,
  };
}

describe('qualityRank', () => {
  test('prefers server qualityWeight when present', () => {
    expect(qualityRank(release({ qualityWeight: 1101 }))).toBe(1101);
  });

  test('ranks by resolution then source', () => {
    const bluray2160 = release({ quality: { quality: { name: 'Bluray-2160p', source: 'bluray', resolution: 2160 } } });
    const webdl1080 = release({ quality: { quality: { name: 'WEBDL-1080p', source: 'web', resolution: 1080 } } });
    const hdtv720 = release({ quality: { quality: { name: 'HDTV-720p', source: 'television', resolution: 720 } } });
    expect(qualityRank(bluray2160)).toBeGreaterThan(qualityRank(webdl1080));
    expect(qualityRank(webdl1080)).toBeGreaterThan(qualityRank(hdtv720));
  });

  test('parses resolution from name when missing', () => {
    const r = release({ quality: { quality: { name: 'WEBRip-1080p' } } });
    expect(qualityTier(r)).toBe('1080p');
  });
});

describe('sortReleases', () => {
  test('sorts by seeders descending', () => {
    const sorted = sortReleases([release({ seeders: 5 }), release({ seeders: 100 })], 'seeders');
    expect(sorted[0].seeders).toBe(100);
  });

  test('sorts by cfScore descending, treating undefined as 0', () => {
    const sorted = sortReleases(
      [release({ customFormatScore: -10 }), release({}), release({ customFormatScore: 50 })],
      'cfScore',
    );
    expect(sorted.map(r => r.customFormatScore)).toEqual([50, undefined, -10]);
  });

  test('rejected releases always sink below approved regardless of sort', () => {
    const sorted = sortReleases(
      [release({ rejected: true, seeders: 999 }), release({ seeders: 1 })],
      'seeders',
    );
    expect(sorted[0].rejected).toBe(false);
    expect(sorted[1].rejected).toBe(true);
  });

  test('null sort keeps input order with rejected last', () => {
    const a = release({ rejected: true });
    const b = release({});
    const c = release({});
    expect(sortReleases([a, b, c], null).map(r => r.guid)).toEqual([b.guid, c.guid, a.guid]);
  });
});

describe('filterReleases', () => {
  test('filters by protocol, tier, approval and season packs', () => {
    const releases = [
      release({ protocol: 'usenet' }),
      release({ rejected: true }),
      release({ fullSeason: true, quality: { quality: { name: 'WEBDL-1080p', resolution: 1080 } } }),
    ];
    expect(filterReleases(releases, { ...defaultReleaseFilters, protocol: 'usenet' })).toHaveLength(1);
    expect(filterReleases(releases, { ...defaultReleaseFilters, qualityTier: '1080p' })).toHaveLength(1);
    expect(filterReleases(releases, { ...defaultReleaseFilters, approvedOnly: true })).toHaveLength(2);
    expect(filterReleases(releases, { ...defaultReleaseFilters, seasonPacksOnly: true })).toHaveLength(1);
    expect(filterReleases(releases, defaultReleaseFilters)).toHaveLength(3);
  });
});

describe('normalizeIndexerFlags', () => {
  test('decodes bitmask flags', () => {
    expect(normalizeIndexerFlags(1)).toEqual(['Freeleech']);
    expect(normalizeIndexerFlags(1 | 16)).toEqual(['Freeleech', 'Scene']);
    expect(normalizeIndexerFlags(0)).toEqual([]);
    expect(normalizeIndexerFlags(undefined)).toEqual([]);
  });

  test('prettifies string flags', () => {
    expect(normalizeIndexerFlags(['g_freeleech', 'double_upload'])).toEqual(['Freeleech', 'Double Upload']);
  });
});

describe('formatReleaseAge', () => {
  test('minutes, hours, days, years', () => {
    expect(formatReleaseAge({ age: 0, ageHours: 0.5, ageMinutes: 30 })).toBe('30m');
    expect(formatReleaseAge({ age: 0, ageHours: 6 })).toBe('6h');
    expect(formatReleaseAge({ age: 20, ageHours: 496 })).toBe('20d');
    expect(formatReleaseAge({ age: 730, ageHours: 17520 })).toBe('2.0y');
  });
});

describe('formatSize', () => {
  test('formats GB, MB and KB', () => {
    expect(formatSize(2820188672)).toBe('2.6 GB');
    expect(formatSize(52428800)).toBe('50 MB');
    expect(formatSize(51200)).toBe('50 KB');
  });
});

describe('peerHealthColor / cfScoreTone', () => {
  test('classifies peer health', () => {
    expect(peerHealthColor(undefined)).not.toBe(peerHealthColor(0));
    expect(peerHealthColor(0)).not.toBe(peerHealthColor(5));
    expect(peerHealthColor(5)).not.toBe(peerHealthColor(50));
  });

  test('classifies CF score tone', () => {
    expect(cfScoreTone(undefined)).toBe('neutral');
    expect(cfScoreTone(0)).toBe('neutral');
    expect(cfScoreTone(10)).toBe('positive');
    expect(cfScoreTone(-10)).toBe('negative');
  });
});
