export interface AffinitySignal {
  genreIds: number[];
  addedAt?: number;   // epoch ms
  weight?: number;    // default 1; watchlist items pass 1.5
}

export interface SeedCandidate {
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  addedAt?: number;
}

// Frequency-weighted genre scores with a recency boost: items added within the
// last 90 days count up to double.
export function computeGenreAffinity(signals: AffinitySignal[], now = Date.now()): Array<{ genreId: number; score: number }> {
  const scores = new Map<number, number>();
  for (const signal of signals) {
    const ageDays = signal.addedAt ? (now - signal.addedAt) / 86400000 : Infinity;
    const recencyBoost = 1 + Math.max(0, 1 - ageDays / 90);
    const weight = (signal.weight ?? 1) * recencyBoost;
    for (const genreId of signal.genreIds) {
      scores.set(genreId, (scores.get(genreId) ?? 0) + weight);
    }
  }
  return [...scores.entries()]
    .map(([genreId, score]) => ({ genreId, score }))
    .sort((a, b) => b.score - a.score);
}

// Weighted-random pick favoring recent additions, so "Because you added X"
// rows rotate between sessions instead of pinning to one title.
export function pickSeeds(candidates: SeedCandidate[], n = 3, random: () => number = Math.random): SeedCandidate[] {
  const pool = [...candidates].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)).slice(0, 12);
  const picked: SeedCandidate[] = [];
  while (picked.length < n && pool.length > 0) {
    // Linear-decay weights over the recency-sorted pool
    const weights = pool.map((_, i) => pool.length - i);
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = random() * total;
    let index = 0;
    for (; index < pool.length; index++) {
      roll -= weights[index];
      if (roll <= 0) break;
    }
    picked.push(pool.splice(Math.min(index, pool.length - 1), 1)[0]);
  }
  return picked;
}
