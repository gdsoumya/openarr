import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions } from 'react-native';
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
import { ExternalRatings, fetchExternalRatings, getCachedRatings } from '../../services/discover/ratingsCache';

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
  const feed: DiscoverFeed = useMemo(() => feedParam ?? { kind: 'discover' }, [feedParam]);
  const getBadge = useLibraryStore((s) => s.getBadge);

  const [filters, setFilters] = useState<DiscoverFilters>(initialFilters ?? { sortBy: 'popularity.desc' });
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState('');
  const [externalRatings, setExternalRatings] = useState<Map<number, ExternalRatings>>(new Map());
  const seenIds = useRef(new Set<number>());
  const loadingRef = useRef(false);
  const inFlightIds = useRef(new Set<number>());

  const clientSort = filters.sortBy === 'client:imdb' ? 'imdb' : filters.sortBy === 'client:rt' ? 'rt' : null;
  const needsRatings = !!clientSort || !!filters.minImdb || !!filters.minRt;

  // Rank loaded titles by IMDB/RT only while that sort is selected. Ratings are
  // fetched once per title ever (persistent cache), 3 at a time. The persistent
  // cache is the completion record, so cancelled runs retry cleanly.
  useEffect(() => {
    if (!needsRatings) return;
    let cancelled = false;
    const pending = items.filter((i) => !inFlightIds.current.has(i.id) && !getCachedRatings(mediaType, i.id));
    if (pending.length === 0) return;
    pending.forEach((i) => inFlightIds.current.add(i.id));

    (async () => {
      const collected = new Map<number, ExternalRatings>();
      for (let batch = 0; batch < pending.length && !cancelled; batch += 3) {
        const chunk = pending.slice(batch, batch + 3);
        const results = await Promise.all(chunk.map(async (i) => ({
          id: i.id,
          ratings: await fetchExternalRatings(mediaType, i.id, (i as TMDBMovie).title ?? (i as TMDBShow).name),
        })));
        results.forEach((r) => collected.set(r.id, r.ratings));
      }
      pending.forEach((i) => inFlightIds.current.delete(i.id));
      if (cancelled || collected.size === 0) return;
      // One state publish per run, a single re-sort instead of one per chunk
      setExternalRatings((prev) => {
        const next = new Map(prev);
        collected.forEach((ratings, id) => next.set(id, ratings));
        return next;
      });
    })();
    return () => {
      cancelled = true;
      // Free this run's claims immediately so the next run can retry titles
      // the cancelled run never finished (its cache writes are the record)
      pending.forEach((i) => inFlightIds.current.delete(i.id));
    };
  }, [needsRatings, items, mediaType]);

  const ratingsFor = useCallback((id: number): ExternalRatings | undefined =>
    externalRatings.get(id) ?? getCachedRatings(mediaType, id), [externalRatings, mediaType]);

  const ratingOf = useCallback((id: number): number | undefined => {
    const r = ratingsFor(id);
    return clientSort === 'imdb' ? r?.imdb : r?.rt;
  }, [ratingsFor, clientSort]);

  const displayItems = useMemo(() => {
    let result = items;
    if (filters.minImdb || filters.minRt) {
      // Titles keep showing until their ratings resolve, then drop if below threshold
      result = result.filter((i) => {
        const r = ratingsFor(i.id);
        if (!r) return true;
        if (filters.minImdb && (r.imdb ?? 0) < filters.minImdb) return false;
        if (filters.minRt && (r.rt ?? 0) < filters.minRt) return false;
        return true;
      });
    }
    if (clientSort) {
      result = [...result].sort((a, b) => (ratingOf(b.id) ?? -1) - (ratingOf(a.id) ?? -1));
    }
    return result;
  }, [items, clientSort, ratingOf, ratingsFor, filters.minImdb, filters.minRt]);

  const fetchPage = useCallback(async (pageNum: number): Promise<PagedResponse<MediaItem>> => {
    // List-only endpoints don't report totals; assume another page exists until one comes back empty
    const asPaged = async (results: MediaItem[]): Promise<PagedResponse<MediaItem>> =>
      ({ page: pageNum, results, total_pages: results.length > 0 ? pageNum + 1 : pageNum, total_results: results.length });

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

  // Fill each FlashList column evenly so the 3-up grid is centered
  const gridPosterW = Math.floor((Dimensions.get('window').width - spacing.xl * 2) / 3) - spacing.sm;

  const resetRequestId = useRef(0);
  // When rating filters drop every loaded title, keep paginating (bounded)
  // so qualifying titles from later pages can still surface
  const AUTO_PAGE_CAP = 6;

  const loadMore = useCallback(async (reset = false) => {
    if (loadingRef.current) {
      if (!reset) return;
      // Invalidate the in-flight fetch so the reset wins
      resetRequestId.current++;
      loadingRef.current = false;
    }
    const requestId = reset ? ++resetRequestId.current : resetRequestId.current;
    const nextPage = reset ? 1 : page + 1;
    if (!reset && nextPage > totalPages) return;
    loadingRef.current = true;
    if (reset) setState('loading');
    try {
      const result = await fetchPage(nextPage);
      if (requestId !== resetRequestId.current) return;
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
      if (requestId !== resetRequestId.current) return;
      setError(e.message ?? 'Failed to load');
      if (reset) setState('error');
    }
    loadingRef.current = false;
  }, [fetchPage, page, totalPages]);

  useEffect(() => { loadMore(true); }, [fetchPage]);

  useEffect(() => {
    if (state === 'loaded' && needsRatings && displayItems.length === 0 && items.length > 0
        && page < totalPages && page < AUTO_PAGE_CAP && !loadingRef.current) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, displayItems.length, items.length, page, totalPages, needsRatings]);

  const activeFilterCount = useMemo(() =>
    (filters.genreIds?.length ?? 0) + (filters.watchProviderIds?.length ?? 0) +
    (filters.networkIds?.length ?? 0) +
    (filters.yearFrom ? 1 : 0) + (filters.yearTo ? 1 : 0) + (filters.minRating ? 1 : 0) +
    (filters.originalLanguage ? 1 : 0) + (filters.originCountry ? 1 : 0) +
    (filters.minImdb ? 1 : 0) + (filters.minRt ? 1 : 0) + (filters.runtimeFrom || filters.runtimeTo ? 1 : 0),
  [filters]);

  const itemTitle = (item: MediaItem) => (item as TMDBMovie).title ?? (item as TMDBShow).name ?? '';
  const itemYear = (item: MediaItem) => ((item as TMDBMovie).release_date ?? (item as TMDBShow).first_air_date)?.slice(0, 4);

  return (
    <View style={styles.container}>
      {feed.kind === 'discover' && (
        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>{displayItems.length} titles</Text>
          <Pressable style={styles.filterBtn} onPress={() => navigation.navigate('DiscoverFilters', { mediaType, filters, onApply: (f: DiscoverFilters) => setFilters(f) })}>
            <Ionicons name="options-outline" size={16} color={colors.primary} />
            <Text style={styles.filterBtnText}>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
          </Pressable>
        </View>
      )}

      {state === 'loading' && <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>}
      {state === 'error' && <ErrorState message={error} onRetry={() => loadMore(true)} />}
      {state === 'loaded' && displayItems.length === 0 && (
        <EmptyState icon="🎬" title="No titles found" message="Try loosening the filters." />
      )}

      {state === 'loaded' && displayItems.length > 0 && (
        <PosterGrid
          data={displayItems}
          onEndReached={() => loadMore()}
          renderItem={(item) => (
            <PosterCard
              title={itemTitle(item)}
              subtitle={clientSort && ratingOf(item.id) !== undefined
                ? `${clientSort === 'imdb' ? 'IMDB' : 'RT'} ${ratingOf(item.id)}${clientSort === 'rt' ? '%' : ''}`
                : itemYear(item)}
              posterUrl={posterUrl(item.poster_path)}
              rating={item.vote_average || undefined}
              size="sm"
              width={gridPosterW}
              badge={getBadge(mediaType, item.id)}
              onPress={() => navigation.push('DiscoveryDetail', { item, type: mediaType })}
              style={styles.gridItem}
            />
          )}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  resultCount: { ...typography.caption, color: colors.textMuted },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  filterBtnText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  gridItem: { marginBottom: spacing.lg, marginRight: spacing.sm },
});
