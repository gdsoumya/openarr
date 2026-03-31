import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { Carousel } from '../../../core/components/Carousel';
import { PosterCard } from '../../../core/components/PosterCard';
import { SearchBar } from '../../../core/components/SearchBar';
import { Movie } from '../types';
import { TMDBMovie, posterUrl } from '../../tmdb/types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [library] = useState<Movie[]>([]);
  const [trending] = useState<TMDBMovie[]>([]);
  const [recentlyReleased] = useState<TMDBMovie[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} tintColor={colors.primary} />}>
      <View style={styles.header}><Text style={styles.title}>Movies</Text></View>
      <SearchBar placeholder="Search your library or discover movies..." value={searchQuery} onChangeText={setSearchQuery} />
      <Carousel title="My Library" count={library.length} onSeeAll={() => {}}>
        {library.map((m) => (
          <PosterCard key={m.id} title={m.title} subtitle={`${m.year} · ${m.genres?.[0] ?? ''}`}
            posterUrl={m.images.find(i => i.coverType === 'poster')?.remoteUrl} badge={getMovieBadge(m)} onPress={() => {}} />
        ))}
      </Carousel>
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
});
