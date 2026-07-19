import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Carousel } from '../../core/components/Carousel';
import { colors } from '../../core/theme/tokens';
import { PosterCard } from '../../core/components/PosterCard';
import { useLibraryStore } from '../../stores/libraryStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { computeGenreAffinity, pickSeeds } from '../../services/discover/affinity';
import { tmdb, isTmdbConfigured } from '../../services/tmdb/instance';
import { DiscoverFilters, posterUrl, TMDBMovie, TMDBShow } from '../../services/tmdb/types';
import { DiscoverFeed } from './DiscoverBrowseScreen';

type MediaItem = (TMDBMovie | TMDBShow) & { id: number };
type RowStatus = 'loading' | 'loaded' | 'error' | 'empty';

interface RowDef {
  key: string;
  title: string;
  fetch: () => Promise<MediaItem[]>;
  browse?: { feed?: DiscoverFeed; filters?: DiscoverFilters };
}

interface DiscoveryRowsProps {
  mediaType: 'movie' | 'tv';
  onItemPress: (item: MediaItem) => void;
  getItemBadge?: (item: MediaItem) => { label: string; variant: any } | undefined;
  refreshToken?: number;
}

// Row results barely change hour to hour — cache across remounts, bypass on
// pull-to-refresh (refreshToken bump)
const ROW_TTL_MS = 6 * 60 * 60 * 1000;
const rowCache = new Map<string, { items: MediaItem[]; at: number; token?: number }>();

const GENRE_ROWS: Record<'movie' | 'tv', Array<{ id: number; label: string }>> = {
  movie: [{ id: 28, label: 'Action' }, { id: 35, label: 'Comedy' }, { id: 878, label: 'Sci-Fi' }],
  tv: [{ id: 10759, label: 'Action & Adventure' }, { id: 35, label: 'Comedy' }, { id: 10765, label: 'Sci-Fi & Fantasy' }],
};

function Row({ def, mediaType, onItemPress, getItemBadge, refreshToken }: {
  def: RowDef; mediaType: 'movie' | 'tv';
  onItemPress: DiscoveryRowsProps['onItemPress'];
  getItemBadge?: DiscoveryRowsProps['getItemBadge'];
  refreshToken?: number;
}) {
  const navigation = useNavigation<any>();
  const watchlistToggle = useWatchlistStore((s) => s.toggle);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<RowStatus>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${mediaType}:${def.key}`;
    const cached = rowCache.get(cacheKey);
    if (cached && Date.now() - cached.at < ROW_TTL_MS && cached.token === refreshToken) {
      setItems(cached.items);
      setStatus(cached.items.length > 0 ? 'loaded' : 'empty');
      return;
    }
    setStatus('loading');
    def.fetch()
      .then((data) => {
        if (cancelled) return;
        // Carousels cap at 12 posters — "See All" has the rest
        const capped = data.slice(0, 12);
        rowCache.set(cacheKey, { items: capped, at: Date.now(), token: refreshToken });
        setItems(capped);
        setStatus(data.length > 0 ? 'loaded' : 'empty');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.response?.status === 401 ? 'Invalid TMDB token — set it in Settings' : e.message ?? 'Failed to load');
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [def.key, refreshToken, mediaType]);

  // Empty personalized/genre rows just disappear instead of showing placeholders
  if (status === 'empty') return null;

  return (
    <Carousel
      title={def.title}
      accent={mediaType === 'movie' ? colors.radarr : colors.sonarr}
      status={status}
      errorMessage={error}
      onSeeAll={def.browse ? () => navigation.navigate('DiscoverBrowse', {
        mediaType, title: def.title, feed: def.browse!.feed, filters: def.browse!.filters,
      }) : undefined}
    >
      {items.map((item: any) => (
        <PosterCard
          key={item.id}
          title={item.title ?? item.name}
          subtitle={(item.release_date ?? item.first_air_date)?.slice(0, 4)}
          posterUrl={posterUrl(item.poster_path)}
          rating={item.vote_average || undefined}
          size="md"
          badge={getItemBadge?.(item)}
          onPress={() => onItemPress(item)}
          onLongPress={() => watchlistToggle({
            tmdbId: item.id, type: mediaType,
            title: item.title ?? item.name ?? '', posterPath: item.poster_path,
            genreIds: item.genre_ids ?? [],
          })}
        />
      ))}
    </Carousel>
  );
}

export function DiscoveryRows({ mediaType, onItemPress, getItemBadge, refreshToken }: DiscoveryRowsProps) {
  const libraryEntries = useLibraryStore((s) => (mediaType === 'movie' ? s.movies : s.shows));
  const watchlist = useWatchlistStore((s) => s.items);
  // Key on membership content, not Map identity — store publishes new Maps every
  // refresh and identity churn would re-roll seeds and refetch all rows
  const libraryKey = useMemo(() => [...libraryEntries.keys()].sort((a, b) => a - b).join(','), [libraryEntries]);

  const rows = useMemo<RowDef[]>(() => {
    if (!isTmdbConfigured()) return [];
    const isMovie = mediaType === 'movie';
    const inLibrary = (item: MediaItem) => libraryEntries.has(item.id);

    const defs: RowDef[] = [
      {
        key: 'trending', title: 'Trending This Week',
        fetch: () => (isMovie ? tmdb.getTrendingMovies() : tmdb.getTrendingShows()) as Promise<MediaItem[]>,
        browse: { feed: { kind: 'trending' } },
      },
    ];

    // Personalized: "Because you added X" seeded from recent library + watchlist adds
    const seeds = pickSeeds([
      ...[...libraryEntries.values()].map((e) => ({ tmdbId: e.tmdbId, type: mediaType, title: e.title })),
      ...watchlist.filter((w) => w.type === mediaType).map((w) => ({ tmdbId: w.tmdbId, type: w.type, title: w.title, addedAt: w.addedAt })),
    ], 2);
    for (const seed of seeds) {
      defs.push({
        key: `seed-${seed.tmdbId}`,
        title: `Because you added ${seed.title}`,
        fetch: async () => {
          const r = await (isMovie ? tmdb.getMovieRecommendations(seed.tmdbId) : tmdb.getShowRecommendations(seed.tmdbId));
          return (r.results as MediaItem[]).filter((i) => !inLibrary(i));
        },
        browse: { feed: { kind: 'recommendations', seedTmdbId: seed.tmdbId } },
      });
    }

    // Personalized: top picks from genre affinity across library + watchlist
    const affinity = computeGenreAffinity([
      ...watchlist.filter((w) => w.type === mediaType).map((w) => ({ genreIds: w.genreIds, addedAt: w.addedAt, weight: 1.5 })),
    ]);
    const topGenres = affinity.slice(0, 3).map((a) => a.genreId);
    if (topGenres.length > 0) {
      const filters: DiscoverFilters = { genreIds: topGenres, sortBy: 'popularity.desc', minVotes: 200 };
      defs.push({
        key: 'top-picks', title: 'Top Picks For You',
        fetch: async () => {
          const r = await (isMovie ? tmdb.discoverMovies(filters) : tmdb.discoverShows(filters));
          return (r.results as MediaItem[]).filter((i) => !inLibrary(i));
        },
        browse: { filters },
      });
    }

    defs.push({
      key: 'popular', title: isMovie ? 'Popular Movies' : 'Popular Shows',
      fetch: async () => (await (isMovie ? tmdb.getPopularMovies() : tmdb.getPopularShows())).results as MediaItem[],
      browse: { feed: { kind: 'popular' } },
    });

    if (isMovie) {
      defs.push({
        key: 'upcoming', title: 'Upcoming',
        fetch: () => tmdb.getUpcomingMovies() as Promise<MediaItem[]>,
        browse: { feed: { kind: 'upcoming' } },
      });
      defs.push({
        key: 'nowplaying', title: 'Now Playing',
        fetch: () => tmdb.getNowPlayingMovies() as Promise<MediaItem[]>,
        browse: { feed: { kind: 'nowplaying' } },
      });
    } else {
      defs.push({
        key: 'ontheair', title: 'On The Air',
        fetch: () => tmdb.getOnTheAirShows() as Promise<MediaItem[]>,
        browse: { feed: { kind: 'ontheair' } },
      });
      defs.push({
        key: 'toprated', title: 'Top Rated',
        fetch: async () => (await tmdb.getTopRatedShows()).results as MediaItem[],
        browse: { feed: { kind: 'toprated' } },
      });
    }

    for (const genre of GENRE_ROWS[mediaType]) {
      const filters: DiscoverFilters = { genreIds: [genre.id], sortBy: 'popularity.desc' };
      defs.push({
        key: `genre-${genre.id}`, title: genre.label,
        fetch: async () => (await (isMovie ? tmdb.discoverMovies(filters) : tmdb.discoverShows(filters))).results as MediaItem[],
        browse: { filters },
      });
    }

    return defs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, libraryKey, watchlist.length, refreshToken]);

  return (
    <>
      {rows.map((def) => (
        <Row key={def.key} def={def} mediaType={mediaType}
          onItemPress={onItemPress} getItemBadge={getItemBadge} refreshToken={refreshToken} />
      ))}
    </>
  );
}
