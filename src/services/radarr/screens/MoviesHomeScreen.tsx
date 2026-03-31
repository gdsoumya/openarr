import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { Carousel } from '../../../core/components/Carousel';
import { PosterCard } from '../../../core/components/PosterCard';
import { SearchBar } from '../../../core/components/SearchBar';
import { Movie } from '../types';
import { TMDBMovie, posterUrl } from '../../tmdb/types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getRadarrAdapter } from '../../../services/adapterFactory';
import { useLibraryCache } from '../../../stores/libraryCache';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';
import { tmdb } from '../../tmdb/instance';

type LoadStatus = 'loading' | 'loaded' | 'error' | 'empty';

interface QueueInfo { movieId?: number; title: string; progress: number; status: string; }

function getMovieBadge(m: Movie, queueMap?: Map<number, QueueInfo>) {
  const qi = queueMap?.get(m.id);
  if (qi) return { label: `↓ ${Math.round(qi.progress)}%`, variant: 'downloading' as const };

  if (m.hasFile && m.movieFile) {
    const q = m.movieFile.quality.quality.name;
    return { label: `✓ ${q}`, variant: 'completed' as const };
  }
  if (!m.hasFile && m.monitored) return { label: 'Missing', variant: 'missing' as const };
  if (m.monitored) return { label: 'Monitored', variant: 'monitored' as const };
  return undefined;
}

export function MoviesHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const config = useServiceConfig('radarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getRadarrAdapter(config, isLocal) : null, [config, isLocal]);
  const setRadarrIds = useLibraryCache((s) => s.setRadarrIds);

  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [recentlyReleased, setRecentlyReleased] = useState<TMDBMovie[]>([]);
  const [radarrSearchResults, setRadarrSearchResults] = useState<Movie[]>([]);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<TMDBMovie[]>([]);
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
        const [movies, queueResult] = await Promise.all([
          adapter.getMovies(),
          adapter.getQueue(1, 50).catch(() => ({ records: [], totalRecords: 0, page: 1, pageSize: 50 })),
        ]);
        setLibrary(movies);
        setRadarrIds(adapter.getTmdbIds(movies));
        // Build queue map: movieId → download info
        const qm = new Map<number, QueueInfo>();
        for (const qi of queueResult.records) {
          const progress = qi.size > 0 ? ((qi.size - qi.sizeleft) / qi.size) * 100 : 0;
          const movieId = (qi as any).movieId;
          if (movieId && !qm.has(movieId)) {
            qm.set(movieId, { movieId, title: qi.title, progress, status: qi.status });
          }
        }
        setQueueMap(qm);
        setLibraryStatus(movies.length > 0 ? 'loaded' : 'empty');
      } catch (e: any) {
        setLibraryStatus('error');
        showToast(`Radarr: ${e.message ?? 'Connection failed'}`, 'error');
      }
    } else {
      setLibraryStatus('empty');
    }

    setTrendingStatus('loading');
    try {
      const data = await tmdb.getTrendingMovies();
      setTrending(data);
      setTrendingStatus(data.length > 0 ? 'loaded' : 'empty');
      setTrendingError('');
    } catch (e: any) {
      setTrendingStatus('error');
      setTrendingError(e.response?.status === 401 ? 'Invalid TMDB token — check config.ts' : `TMDB: ${e.message ?? 'Failed to load'}`);
    }

    setRecentStatus('loading');
    try {
      const data = await tmdb.getNowPlayingMovies();
      setRecentlyReleased(data);
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
    if (!q) { setRadarrSearchResults([]); setTmdbSearchResults([]); return; }
    setSearching(true);
    try {
      // Search both Radarr (if configured) AND TMDB in parallel for best results
      const promises: Promise<any>[] = [
        tmdb.searchMovies(q).catch(() => ({ results: [], totalResults: 0 })),
      ];
      if (adapter) {
        promises.push(adapter.lookupMovie(q).catch(() => []));
      }
      const [tmdbResult, radarrResult] = await Promise.all(promises);
      setTmdbSearchResults(tmdbResult.results ?? []);
      setRadarrSearchResults(radarrResult ?? []);
    } catch (e: any) {
      showToast(`Search failed: ${e.message}`, 'error');
    }
    setSearching(false);
  }, [searchQuery, adapter]);

  useEffect(() => {
    if (!searchQuery.trim()) { setRadarrSearchResults([]); setTmdbSearchResults([]); }
  }, [searchQuery]);

  if (initialLoading) return <LoadingSpinner message="Loading movies..." />;

  const displayLibrary = searchQuery
    ? library.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : library;

  const isSearchMode = searchQuery.trim().length > 0;
  const hasSearchResults = radarrSearchResults.length > 0 || tmdbSearchResults.length > 0;
  const libraryTmdbIds = new Set(library.map(m => m.tmdbId));
  const libraryByTmdbId = useMemo(() => {
    const map = new Map<number, Movie>();
    library.forEach(m => map.set(m.tmdbId, m));
    return map;
  }, [library]);

  const getTmdbMovieBadge = (tmdbItem: TMDBMovie) => {
    const match = libraryByTmdbId.get(tmdbItem.id);
    if (match) return getMovieBadge(match, queueMap) ?? { label: 'In Library', variant: 'inLibrary' as const };
    return undefined;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }}
          tintColor={colors.primary}
        />
      }>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}><Text style={styles.title}>Movies</Text></View>
      <SearchBar
        placeholder="Search for movies to add..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={doSearch}
      />

      {!config && !isSearchMode && (
        <View style={styles.notConfigured}>
          <Text style={styles.notConfiguredText}>Radarr not configured. Add it in Settings to manage your library.</Text>
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

          {/* Radarr lookup results — ready to add directly */}
          {!searching && radarrSearchResults.length > 0 && (
            <Carousel title="From Radarr (ready to add)" count={radarrSearchResults.length} status="loaded">
              {radarrSearchResults.map((m, idx) => {
                const inLibrary = libraryTmdbIds.has(m.tmdbId);
                return (
                  <PosterCard key={`radarr-${m.tmdbId}-${idx}`} title={m.title}
                    subtitle={`${m.year ?? ''} · ${m.genres?.[0] ?? ''}`}
                    posterUrl={m.images?.find(i => i.coverType === 'poster')?.remoteUrl}
                    badge={inLibrary ? { label: 'In Library', variant: 'inLibrary' } : undefined}
                    onPress={() => {
                      if (inLibrary) {
                        const existing = library.find(l => l.tmdbId === m.tmdbId);
                        if (existing) navigation.navigate('MovieDetail', { movie: existing });
                      } else {
                        navigation.navigate('DiscoveryDetail', { item: m, type: 'movie' });
                      }
                    }} />
                );
              })}
            </Carousel>
          )}

          {/* TMDB search results — broader discovery */}
          {!searching && tmdbSearchResults.length > 0 && (
            <Carousel title="From TMDB" count={tmdbSearchResults.length} status="loaded">
              {tmdbSearchResults.map((m, idx) => (
                <PosterCard key={`tmdb-${m.id}-${idx}`} title={m.title} subtitle={`${m.release_date?.slice(0, 4) ?? ''} · ★ ${m.vote_average?.toFixed(1) ?? ''}`}
                  posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md"
                  onPress={() => navigation.navigate('DiscoveryDetail', { item: m, type: 'movie' })} />
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
          {displayLibrary.map((m) => (
            <PosterCard key={m.id} title={m.title} subtitle={`${m.year} · ${m.genres?.[0] ?? ''}`}
              posterUrl={m.images.find(i => i.coverType === 'poster')?.remoteUrl}
              badge={getMovieBadge(m, queueMap)}
              progress={queueMap?.has(m.id) ? (queueMap.get(m.id)!.progress / 100) : undefined}
              onPress={() => navigation.navigate('MovieDetail', { movie: m })} />
          ))}
        </Carousel>
      )}

      {/* Discovery carousels — hide when searching */}
      {!isSearchMode && (
        <>
          <Carousel title="Trending This Week"
            status={trendingStatus} errorMessage={trendingError}>
            {trending.map((m) => (
              <PosterCard key={m.id} title={m.title} subtitle={m.release_date?.slice(0, 4) ?? ''} posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md" onPress={() => navigation.navigate('DiscoveryDetail', { item: m, type: 'movie' })} />
            ))}
          </Carousel>

          <Carousel title="Recently Released"
            status={recentStatus} errorMessage={recentError}>
            {recentlyReleased.map((m) => (
              <PosterCard key={m.id} title={m.title} subtitle={m.release_date ?? ''} posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md" onPress={() => navigation.navigate('DiscoveryDetail', { item: m, type: 'movie' })} />
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
