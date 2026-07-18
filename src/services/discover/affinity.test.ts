import { computeGenreAffinity, pickSeeds } from './affinity';

const DAY = 86400000;

describe('computeGenreAffinity', () => {
  test('weights by frequency', () => {
    const result = computeGenreAffinity([
      { genreIds: [28, 35] },
      { genreIds: [28] },
    ]);
    expect(result[0].genreId).toBe(28);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  test('recent additions get a recency boost', () => {
    const now = Date.now();
    const fresh = computeGenreAffinity([{ genreIds: [1], addedAt: now }], now);
    const stale = computeGenreAffinity([{ genreIds: [1], addedAt: now - 365 * DAY }], now);
    expect(fresh[0].score).toBeCloseTo(2);
    expect(stale[0].score).toBeCloseTo(1);
  });

  test('custom weight multiplies', () => {
    const now = Date.now();
    const result = computeGenreAffinity([{ genreIds: [1], weight: 1.5, addedAt: now - 400 * DAY }], now);
    expect(result[0].score).toBeCloseTo(1.5);
  });

  test('empty input', () => {
    expect(computeGenreAffinity([])).toEqual([]);
  });
});

describe('pickSeeds', () => {
  const candidates = Array.from({ length: 8 }, (_, i) => ({
    tmdbId: i + 1, type: 'movie' as const, title: `Movie ${i + 1}`, addedAt: i,
  }));

  test('returns n unique seeds', () => {
    const seeds = pickSeeds(candidates, 3, () => 0.5);
    expect(seeds).toHaveLength(3);
    expect(new Set(seeds.map((s) => s.tmdbId)).size).toBe(3);
  });

  test('deterministic with a fixed random source', () => {
    const a = pickSeeds(candidates, 3, () => 0.1);
    const b = pickSeeds(candidates, 3, () => 0.1);
    expect(a).toEqual(b);
  });

  test('handles fewer candidates than requested', () => {
    expect(pickSeeds(candidates.slice(0, 2), 5, () => 0.5)).toHaveLength(2);
  });
});
