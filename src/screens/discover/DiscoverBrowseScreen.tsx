import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../core/theme/tokens';
import { PosterGrid } from '../../core/components/PosterGrid';
import { PosterCard } from '../../core/components/PosterCard';
import { EmptyState } from '../../core/components/EmptyState';
import { ErrorState } from '../../core/components/ErrorState';
import { useLibraryStore } from '../../stores/libraryStore';
import { tmdb } from '../../services/tmdb/instance';
import { DiscoverFilters, PagedResponse, posterUrl, TMDBMovie, TMDBShow } from '../../services/tmdb/types';
import { DiscoverFilterSheet } from './DiscoverFilterSheet';

export type DiscoverFeed =
  | { kind: 'discover' }
  | { kind: 'trending' } | { kind: 'popular' } | { kind: 'toprated' }
  | { kind: 'upcoming' } | { kind: 'nowplaying' } | { kind: 'ontheair' }
  | { kind: 'recommendations'; seedTmdbId: number };

type MediaItem = (TMDBMovie | TMDBShow) & { id: number };

export function DiscoverBrowseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { mediaType, title, filters: initialFilters, feed: feedParam } = route.params as {
    mediaType: 'movie' | 'tv'; title: string; filters?: DiscoverFilters; feed?: DiscoverFeed;
  };
  const feed: DiscoverFeed = feedParam ?? { kind: 'discover' };
  const getBadge = useLibraryStore((s) => s.getBadge);

  const [filters, setFilters] = useState<DiscoverFilters>(initialFilters ?? { sortBy: 'popularity.desc' });
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const seenIds = useRef(new Set<number>());
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (pageNum: number): Promise<PagedResponse<MediaItem>> => {
    const asPaged = async (results: MediaItem[]): Promise<PagedResponse<MediaItem>> =>
      ({ page: pageNum, results, total_pages: pageNum, total_results: results.length });

    switch (feed.kind) {
      case 'trending':
        return asPaged(mediaType === 'movie' ? await tmdb.getTrendingMovies(pageNum) as MediaItem[] : await tmdb.getTrendingShows(pageNum) as MediaItem[]);
      case 'popular':
        return (mediaType === 'movie' ? tmdb.getPopularMovies(pageNum) : tmdb.getPopularShows(pageNum)) as Promise<PagedResponse<MediaItem>>;
      case 'toprated':
        return (mediaType === 'movie' ? tmdb.getTopRatedMovies(pageNum) : tmdb.getTopRatedShows(pageNum)) as Promise<PagedResponse<MediaItem>>;
      case 'upcoming':
        return asPaged(await tmdb.getUpcomingMovies(pageNum) as MediaItem[]);
      case 'nowplaying':
        return asPaged(await tmdb.getNowPlayingMovies(pageNum) as MediaItem[]);
      case 'ontheair':
        return asPaged(await tmdb.getOnTheAirShows(pageNum) as MediaItem[]);
      case 'recommendations':
        return (mediaType === 'movie'
          ? tmdb.getMovieRecommendations(feed.seedTmdbId, pageNum)
          : tmdb.getShowRecommendations(feed.seedTmdbId, pageNum)) as Promise<PagedResponse<MediaItem>>;
      case 'discover':
      default:
        return (mediaType === 'movie' ? tmdb.discoverMovies(filters, pageNum) : tmdb.discoverShows(filters, pageNum)) as Promise<PagedResponse<MediaItem>>;
    }
  }, [feed, mediaType, filters]);

  const loadMore = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    const nextPage = reset ? 1 : page + 1;
    if (!reset && nextPage > totalPages) return;
    loadingRef.current = true;
    if (reset) setState('loading');
    try {
      const result = await fetchPage(nextPage);
      if (reset) seenIds.current = new Set();
      const fresh = (result.results ?? []).filter((r) => {
        if (seenIds.current.has(r.id)) return false;
        seenIds.current.add(r.id);
        return true;
      });
      setItems((prev) => reset ? fresh : [...prev, ...fresh]);
      setPage(nextPage);
      setTotalPages(result.total_pages ?? nextPage);
      setState('loaded');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
      if (reset) setState('error');
    }
    loadingRef.current = false;
  }, [fetchPage, page, totalPages]);

  useEffect(() => { loadMore(true); }, [fetchPage]);

  const activeFilterCount = useMemo(() =>
    (filters.genreIds?.length ?? 0) + (filters.watchProviderIds?.length ?? 0) +
    (filters.yearFrom ? 1 : 0) + (filters.yearTo ? 1 : 0) + (filters.minRating ? 1 : 0),
  [filters]);

  const itemTitle = (item: MediaItem) => (item as TMDBMovie).title ?? (item as TMDBShow).name ?? '';
  const itemYear = (item: MediaItem) => ((item as TMDBMovie).release_date ?? (item as TMDBShow).first_air_date)?.slice(0, 4);

  return (
    <View style={styles.container}>
      {feed.kind === 'discover' && (
        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>{items.length} titles</Text>
          <Pressable style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={16} color={colors.primary} />
            <Text style={styles.filterBtnText}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
          </Pressable>
        </View>
      )}

      {state === 'loading' && <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>}
      {state === 'error' && <ErrorState message={error} onRetry={() => loadMore(true)} />}
      {state === 'loaded' && items.length === 0 && (
        <EmptyState icon="🎬" title="No titles found" message="Try loosening the filters." />
      )}

      {state === 'loaded' && items.length > 0 && (
        <PosterGrid
          data={items}
          onEndReached={() => loadMore()}
          renderItem={(item) => (
            <PosterCard
              title={itemTitle(item)}
              subtitle={itemYear(item)}
              posterUrl={posterUrl(item.poster_path)}
              rating={item.vote_average || undefined}
              size="sm"
              badge={getBadge(mediaType, item.id)}
              onPress={() => navigation.push('DiscoveryDetail', { item, type: mediaType })}
              style={styles.gridItem}
            />
          )}
        />
      )}

      <DiscoverFilterSheet
        visible={showFilters}
        mediaType={mediaType}
        filters={filters}
        onApply={(f) => { setShowFilters(false); setFilters(f); }}
        onDismiss={() => setShowFilters(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  resultCount: { ...typography.caption, color: colors.textMuted },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  filterBtnText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  gridItem: { marginBottom: spacing.lg, marginRight: spacing.sm },
});
