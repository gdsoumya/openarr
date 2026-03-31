import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
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
  const config = useServiceConfig('radarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getRadarrAdapter(config, isLocal) : null, [config, isLocal]);
  const setRadarrIds = useLibraryCache((s) => s.setRadarrIds);

  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [recentlyReleased, setRecentlyReleased] = useState<TMDBMovie[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const [libraryStatus, setLibraryStatus] = useState<LoadStatus>('loading');
  const [trendingStatus, setTrendingStatus] = useState<LoadStatus>('loading');
  const [recentStatus, setRecentStatus] = useState<LoadStatus>('loading');
  const [trendingError, setTrendingError] = useState('');
  const [recentError, setRecentError] = useState('');

  const fetchData = useCallback(async () => {
    // Library from Radarr
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

    // Trending from TMDB
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

    // Recently released from TMDB
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

  if (initialLoading) return <LoadingSpinner message="Loading movies..." />;

  const displayLibrary = searchQuery
    ? library.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : library;

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
      <SearchBar placeholder="Search your library or discover movies..." value={searchQuery} onChangeText={setSearchQuery} />

      {!config && (
        <View style={styles.notConfigured}>
          <Text style={styles.notConfiguredText}>Radarr not configured. Add it in Settings to see your library.</Text>
        </View>
      )}

      <Carousel title="My Library" count={displayLibrary.length} onSeeAll={() => {}}
        status={!config ? 'empty' : libraryStatus}>
        {displayLibrary.map((m) => (
          <PosterCard key={m.id} title={m.title} subtitle={`${m.year} · ${m.genres?.[0] ?? ''}`}
            posterUrl={m.images.find(i => i.coverType === 'poster')?.remoteUrl} badge={getMovieBadge(m)} onPress={() => {}} />
        ))}
      </Carousel>

      <Carousel title="Trending This Week" onSeeAll={() => {}}
        status={trendingStatus} errorMessage={trendingError}>
        {trending.map((m) => (
          <PosterCard key={m.id} title={m.title} subtitle={m.release_date?.slice(0, 4) ?? ''} posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md" onPress={() => {}} />
        ))}
      </Carousel>

      <Carousel title="Recently Released" onSeeAll={() => {}}
        status={recentStatus} errorMessage={recentError}>
        {recentlyReleased.map((m) => (
          <PosterCard key={m.id} title={m.title} subtitle={m.release_date ?? ''} posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md" onPress={() => {}} />
        ))}
      </Carousel>
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
});
