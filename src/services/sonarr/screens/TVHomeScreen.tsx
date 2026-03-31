import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { Carousel } from '../../../core/components/Carousel';
import { PosterCard } from '../../../core/components/PosterCard';
import { SearchBar } from '../../../core/components/SearchBar';
import { useLibraryCache } from '../../../stores/libraryCache';
import { Series } from '../types';
import { TMDBShow, posterUrl } from '../../tmdb/types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [library] = useState<Series[]>([]);
  const [trending] = useState<TMDBShow[]>([]);
  const [recentlyAired] = useState<TMDBShow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} tintColor={colors.primary} />}>
      <View style={styles.header}><Text style={styles.title}>TV Shows</Text></View>
      <SearchBar placeholder="Search your library or discover new shows..." value={searchQuery} onChangeText={setSearchQuery} />
      <Carousel title="My Library" count={library.length} onSeeAll={() => {}}>
        {library.map((s) => (
          <PosterCard key={s.id} title={s.title} subtitle={`${s.network} · ${s.status === 'continuing' ? 'Airing' : 'Ended'}`}
            posterUrl={s.images.find(i => i.coverType === 'poster')?.remoteUrl} badge={getSeriesBadge(s)} onPress={() => {}} />
        ))}
      </Carousel>
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
});
