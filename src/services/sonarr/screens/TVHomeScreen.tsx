import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
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
import { TMDB_API_KEY } from '../../../core/config';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';

const tmdb = new TMDBClient(TMDB_API_KEY);

function getSeriesBadge(s: Series) {
  const st = s.statistics;
  if (!st) return undefined;
  if (st.episodeFileCount === st.totalEpisodeCount && st.totalEpisodeCount > 0) return { label: '✓ All', variant: 'completed' as const };
  const missing = st.episodeCount - st.episodeFileCount;
  if (missing > 0) return { label: `${missing} missing`, variant: 'missing' as const };
  if (s.monitored) return { label: 'Monitored', variant: 'monitored' as const };
  return undefined;
}

export function TVHomeScreen() {
  const config = useServiceConfig('sonarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getSonarrAdapter(config, isLocal) : null, [config, isLocal]);
  const setSonarrIds = useLibraryCache((s) => s.setSonarrIds);

  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<Series[]>([]);
  const [trending, setTrending] = useState<TMDBShow[]>([]);
  const [recentlyAired, setRecentlyAired] = useState<TMDBShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.show);

  async function fetchData() {
    try {
      if (adapter) {
        const series = await adapter.getSeries();
        setLibrary(series);
        setSonarrIds(adapter.getTvdbIds(series));
      }
      const [trendingData, recentData] = await Promise.all([
        tmdb.getTrendingShows().catch(() => []),
        tmdb.getOnTheAirShows().catch(() => []),
      ]);
      setTrending(trendingData);
      setRecentlyAired(recentData);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to fetch TV shows', 'error');
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [adapter]);

  if (loading) return <LoadingSpinner message="Loading TV shows..." />;

  const displayLibrary = searchQuery
    ? library.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
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
      <View style={styles.header}><Text style={styles.title}>TV Shows</Text></View>
      <SearchBar placeholder="Search your library or discover new shows..." value={searchQuery} onChangeText={setSearchQuery} />

      {!config && (
        <View style={styles.notConfigured}>
          <Text style={styles.notConfiguredText}>Sonarr not configured. Add it in Settings to see your library.</Text>
        </View>
      )}

      {(config || displayLibrary.length > 0) && (
        <Carousel title="My Library" count={displayLibrary.length} onSeeAll={() => {}}>
          {displayLibrary.map((s) => (
            <PosterCard key={s.id} title={s.title} subtitle={`${s.network} · ${s.status === 'continuing' ? 'Airing' : 'Ended'}`}
              posterUrl={s.images.find(i => i.coverType === 'poster')?.remoteUrl} badge={getSeriesBadge(s)} onPress={() => {}} />
          ))}
        </Carousel>
      )}

      <Carousel title="Trending This Week" onSeeAll={() => {}}>
        {trending.map((s) => (
          <PosterCard key={s.id} title={s.name} subtitle={s.first_air_date?.slice(0, 4) ?? ''} posterUrl={posterUrl(s.poster_path)} rating={s.vote_average} size="md" onPress={() => {}} />
        ))}
      </Carousel>
      <Carousel title="Recently Aired" onSeeAll={() => {}}>
        {recentlyAired.map((s) => (
          <PosterCard key={s.id} title={s.name} subtitle={s.first_air_date ?? ''} posterUrl={posterUrl(s.poster_path)} rating={s.vote_average} size="md" onPress={() => {}} />
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
