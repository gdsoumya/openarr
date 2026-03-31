import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
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
import { TMDB_API_KEY } from '../../../core/config';

const tmdb = new TMDBClient(TMDB_API_KEY);

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
  const config = useServiceConfig('radarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getRadarrAdapter(config, isLocal) : null, [config, isLocal]);
  const setRadarrIds = useLibraryCache((s) => s.setRadarrIds);

  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [recentlyReleased, setRecentlyReleased] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      if (adapter) {
        const movies = await adapter.getMovies();
        setLibrary(movies);
        setRadarrIds(adapter.getTmdbIds(movies));
      }
      const [trendingData, nowPlayingData] = await Promise.all([
        tmdb.getTrendingMovies().catch(() => []),
        tmdb.getNowPlayingMovies().catch(() => []),
      ]);
      setTrending(trendingData);
      setRecentlyReleased(nowPlayingData);
    } catch (e) {
      console.error('Movies fetch error:', e);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [adapter]);

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
      <View style={styles.header}><Text style={styles.title}>Movies</Text></View>
      <SearchBar placeholder="Search your library or discover movies..." value={searchQuery} onChangeText={setSearchQuery} />

      {!config && (
        <View style={styles.notConfigured}>
          <Text style={styles.notConfiguredText}>Radarr not configured. Add it in Settings to see your library.</Text>
        </View>
      )}

      {(config || displayLibrary.length > 0) && (
        <Carousel title="My Library" count={displayLibrary.length} onSeeAll={() => {}}>
          {displayLibrary.map((m) => (
            <PosterCard key={m.id} title={m.title} subtitle={`${m.year} · ${m.genres?.[0] ?? ''}`}
              posterUrl={m.images.find(i => i.coverType === 'poster')?.remoteUrl} badge={getMovieBadge(m)} onPress={() => {}} />
          ))}
        </Carousel>
      )}

      <Carousel title="Trending This Week" onSeeAll={() => {}}>
        {trending.map((m) => (
          <PosterCard key={m.id} title={m.title} subtitle={m.release_date?.slice(0, 4) ?? ''} posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md" onPress={() => {}} />
        ))}
      </Carousel>
      <Carousel title="Recently Released" onSeeAll={() => {}}>
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
  header: { paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  notConfigured: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
  notConfiguredText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
