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
import { TMDBClient } from '../../tmdb/client';
import { TMDB_READ_ACCESS_TOKEN } from '../../../core/config';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';

const tmdb = new TMDBClient(TMDB_READ_ACCESS_TOKEN);

type LoadStatus = 'loading' | 'loaded' | 'error' | 'empty';

function getMovieBadge(m: Movie) {
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
        const movies = await adapter.getMovies();
        setLibrary(movies);
        setRadarrIds(adapter.getTmdbIds(movies));
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
      if (adapter) {
        const results = await adapter.lookupMovie(q);
        setRadarrSearchResults(results);
        setTmdbSearchResults([]);
      } else {
        const results = await tmdb.searchMovies(q);
        setTmdbSearchResults(results);
        setRadarrSearchResults([]);
      }
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
        placeholder={adapter ? 'Search movies to add (via Radarr)...' : 'Search TMDB for movies...'}
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
              <Text style={styles.searchingText}>Searching{adapter ? ' Radarr' : ' TMDB'}...</Text>
            </View>
          )}

          {/* Radarr lookup results */}
          {!searching && radarrSearchResults.length > 0 && (
            <Carousel title={`Results for "${searchQuery}"`} count={radarrSearchResults.length} status="loaded">
              {radarrSearchResults.map((m) => {
                const inLibrary = libraryTmdbIds.has(m.tmdbId);
                return (
                  <PosterCard key={m.tmdbId} title={m.title}
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

          {/* TMDB search results (when Radarr not configured) */}
          {!searching && tmdbSearchResults.length > 0 && (
            <Carousel title={`Results for "${searchQuery}"`} count={tmdbSearchResults.length} status="loaded">
              {tmdbSearchResults.map((m) => (
                <PosterCard key={m.id} title={m.title} subtitle={m.release_date?.slice(0, 4) ?? ''}
                  posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md"
                  onPress={() => navigation.navigate('DiscoveryDetail', { item: m, type: 'movie' })} />
              ))}
            </Carousel>
          )}

          {!searching && !hasSearchResults && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Press return to search. Results from {adapter ? 'Radarr (TMDB)' : 'TMDB'}.</Text>
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
              posterUrl={m.images.find(i => i.coverType === 'poster')?.remoteUrl} badge={getMovieBadge(m)}
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
