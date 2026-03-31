import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { Carousel } from '../../../core/components/Carousel';
import { PosterCard } from '../../../core/components/PosterCard';
import { SearchBar } from '../../../core/components/SearchBar';
import { useLibraryCache } from '../../../stores/libraryCache';
import { Series } from '../types';
import { TMDBShow, posterUrl } from '../../tmdb/types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getSonarrAdapter } from '../../../services/adapterFactory';
import { TMDBClient } from '../../tmdb/client';
import { TMDB_READ_ACCESS_TOKEN } from '../../../core/config';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';

const tmdb = new TMDBClient(TMDB_READ_ACCESS_TOKEN);

type LoadStatus = 'loading' | 'loaded' | 'error' | 'empty';

interface QueueInfo { seriesId?: number; movieId?: number; title: string; progress: number; }

function getSeriesBadge(s: Series, queueMap: Map<number, QueueInfo>) {
  // Check if downloading
  const qi = queueMap.get(s.id);
  if (qi) return { label: `↓ ${Math.round(qi.progress)}%`, variant: 'downloading' as const };

  const st = s.statistics;
  if (!st) return undefined;
  if (st.episodeFileCount === st.totalEpisodeCount && st.totalEpisodeCount > 0) return { label: '✓ All', variant: 'completed' as const };
  const missing = st.episodeCount - st.episodeFileCount;
  if (missing > 0) return { label: `${missing} missing`, variant: 'missing' as const };
  if (s.monitored) return { label: 'Monitored', variant: 'monitored' as const };
  return undefined;
}

export function TVHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const config = useServiceConfig('sonarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getSonarrAdapter(config, isLocal) : null, [config, isLocal]);
  const setSonarrIds = useLibraryCache((s) => s.setSonarrIds);

  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<Series[]>([]);
  const [trending, setTrending] = useState<TMDBShow[]>([]);
  const [recentlyAired, setRecentlyAired] = useState<TMDBShow[]>([]);
  // Search results — Sonarr lookup returns Series[], TMDB returns TMDBShow[]
  const [sonarrSearchResults, setSonarrSearchResults] = useState<Series[]>([]);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<TMDBShow[]>([]);
  const [searching, setSearching] = useState(false);
  const [queueMap, setQueueMap] = useState<Map<number, QueueInfo>>(new Map());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const [libraryStatus, setLibraryStatus] = useState<LoadStatus>('loading');
  const [trendingStatus, setTrendingStatus] = useState<LoadStatus>('loading');
  const [recentStatus, setRecentStatus] = useState<LoadStatus>('loading');
  const [trendingError, setTrendingError] = useState('');
  const [recentError, setRecentError] = useState('');

  const fetchData = useCallback(async () => {
    if (adapter) {
      setLibraryStatus('loading');
      try {
        const [series, queueResult] = await Promise.all([
          adapter.getSeries(),
          adapter.getQueue(1, 50).catch(() => ({ records: [], totalRecords: 0, page: 1, pageSize: 50 })),
        ]);
        setLibrary(series);
        setSonarrIds(adapter.getTvdbIds(series));
        // Build queue map: seriesId → download info
        const qm = new Map<number, QueueInfo>();
        for (const qi of queueResult.records) {
          const progress = qi.size > 0 ? ((qi.size - qi.sizeleft) / qi.size) * 100 : 0;
          // Queue items have seriesId in Sonarr (not in our QueueItem type but the API returns it)
          const seriesId = (qi as any).seriesId;
          if (seriesId && !qm.has(seriesId)) {
            qm.set(seriesId, { seriesId, title: qi.title, progress });
          }
        }
        setQueueMap(qm);
        setLibraryStatus(series.length > 0 ? 'loaded' : 'empty');
      } catch (e: any) {
        setLibraryStatus('error');
        showToast(`Sonarr: ${e.message ?? 'Connection failed'}`, 'error');
      }
    } else {
      setLibraryStatus('empty');
    }

    setTrendingStatus('loading');
    try {
      const data = await tmdb.getTrendingShows();
      setTrending(data);
      setTrendingStatus(data.length > 0 ? 'loaded' : 'empty');
      setTrendingError('');
    } catch (e: any) {
      setTrendingStatus('error');
      setTrendingError(e.response?.status === 401 ? 'Invalid TMDB token — check config.ts' : `TMDB: ${e.message ?? 'Failed to load'}`);
    }

    setRecentStatus('loading');
    try {
      const data = await tmdb.getOnTheAirShows();
      setRecentlyAired(data);
      setRecentStatus(data.length > 0 ? 'loaded' : 'empty');
      setRecentError('');
    } catch (e: any) {
      setRecentStatus('error');
      setRecentError(e.response?.status === 401 ? 'Invalid TMDB token' : `TMDB: ${e.message ?? 'Failed to load'}`);
    }

    setInitialLoading(false);
  }, [adapter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) { setSonarrSearchResults([]); setTmdbSearchResults([]); return; }
    setSearching(true);
    try {
      // Search both Sonarr (if configured) AND TMDB in parallel for best results
      const promises: Promise<any>[] = [
        tmdb.searchTV(q).catch(() => ({ results: [], totalResults: 0 })),
      ];
      if (adapter) {
        promises.push(adapter.lookupSeries(q).catch(() => []));
      }
      const [tmdbResult, sonarrResult] = await Promise.all(promises);
      setTmdbSearchResults(tmdbResult.results ?? []);
      setSonarrSearchResults(sonarrResult ?? []);
    } catch (e: any) {
      showToast(`Search failed: ${e.message}`, 'error');
    }
    setSearching(false);
  }, [searchQuery, adapter]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSonarrSearchResults([]); setTmdbSearchResults([]); }
  }, [searchQuery]);

  if (initialLoading) return <LoadingSpinner message="Loading TV shows..." />;

  const displayLibrary = searchQuery
    ? library.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : library;

  const isSearchMode = searchQuery.trim().length > 0;
  const hasSearchResults = sonarrSearchResults.length > 0 || tmdbSearchResults.length > 0;
  // Track which TVDB IDs are in library to show "In Library" badge
  const libraryTvdbIds = new Set(library.map(s => s.tvdbId));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }}
          tintColor={colors.primary}
        />
      }>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}><Text style={styles.title}>TV Shows</Text></View>
      <SearchBar
        placeholder="Search for shows to add..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={doSearch}
      />

      {!config && !isSearchMode && (
        <View style={styles.notConfigured}>
          <Text style={styles.notConfiguredText}>Sonarr not configured. Add it in Settings to manage your library.</Text>
        </View>
      )}

      {/* Search results */}
      {isSearchMode && (
        <>
          {searching && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}

          {/* Sonarr lookup results — ready to add directly */}
          {!searching && sonarrSearchResults.length > 0 && (
            <Carousel title="From Sonarr (ready to add)" count={sonarrSearchResults.length} status="loaded">
              {sonarrSearchResults.map((s, idx) => {
                const inLibrary = libraryTvdbIds.has(s.tvdbId);
                return (
                  <PosterCard key={`sonarr-${s.tvdbId}-${idx}`} title={s.title}
                    subtitle={`${s.year ?? ''} · ${s.network ?? ''}`}
                    posterUrl={s.images?.find(i => i.coverType === 'poster')?.remoteUrl}
                    badge={inLibrary ? { label: 'In Library', variant: 'inLibrary' } : undefined}
                    onPress={() => {
                      if (inLibrary) {
                        const existing = library.find(l => l.tvdbId === s.tvdbId);
                        if (existing) navigation.navigate('SeriesDetail', { series: existing });
                      } else {
                        navigation.navigate('DiscoveryDetail', { item: s, type: 'tv' });
                      }
                    }} />
                );
              })}
            </Carousel>
          )}

          {/* TMDB search results — broader discovery */}
          {!searching && tmdbSearchResults.length > 0 && (
            <Carousel title="From TMDB" count={tmdbSearchResults.length} status="loaded">
              {tmdbSearchResults.map((s, idx) => (
                <PosterCard key={`tmdb-${s.id}-${idx}`} title={s.name} subtitle={`${s.first_air_date?.slice(0, 4) ?? ''} · ★ ${s.vote_average?.toFixed(1) ?? ''}`}
                  posterUrl={posterUrl(s.poster_path)} rating={s.vote_average} size="md"
                  onPress={() => navigation.navigate('DiscoveryDetail', { item: s, type: 'tv' })} />
              ))}
            </Carousel>
          )}

          {!searching && !hasSearchResults && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Press return to search.</Text>
            </View>
          )}
        </>
      )}

      {/* Library — filtered when searching */}
      {displayLibrary.length > 0 && (
        <Carousel title={isSearchMode ? 'In Your Library' : 'My Library'} count={displayLibrary.length}
          status={!config ? 'empty' : libraryStatus}>
          {displayLibrary.map((s) => (
            <PosterCard key={s.id} title={s.title} subtitle={`${s.network} · ${s.status === 'continuing' ? 'Airing' : 'Ended'}`}
              posterUrl={s.images.find(i => i.coverType === 'poster')?.remoteUrl}
              badge={getSeriesBadge(s, queueMap)}
              progress={queueMap.has(s.id) ? (queueMap.get(s.id)!.progress / 100) : undefined}
              onPress={() => navigation.navigate('SeriesDetail', { series: s })} />
          ))}
        </Carousel>
      )}

      {/* Discovery carousels — hide when searching */}
      {!isSearchMode && (
        <>
          <Carousel title="Trending This Week"
            status={trendingStatus} errorMessage={trendingError}>
            {trending.map((s) => (
              <PosterCard key={s.id} title={s.name} subtitle={s.first_air_date?.slice(0, 4) ?? ''} posterUrl={posterUrl(s.poster_path)} rating={s.vote_average} size="md" onPress={() => navigation.navigate('DiscoveryDetail', { item: s, type: 'tv' })} />
            ))}
          </Carousel>

          <Carousel title="Recently Aired"
            status={recentStatus} errorMessage={recentError}>
            {recentlyAired.map((s) => (
              <PosterCard key={s.id} title={s.name} subtitle={s.first_air_date ?? ''} posterUrl={posterUrl(s.poster_path)} rating={s.vote_average} size="md" onPress={() => navigation.navigate('DiscoveryDetail', { item: s, type: 'tv' })} />
            ))}
          </Carousel>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  notConfigured: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
  notConfiguredText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  searchingText: { ...typography.caption, color: colors.textMuted },
  noResults: { padding: spacing.xl, alignItems: 'center' },
  noResultsText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
