import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { MetadataPills } from '../../../core/components/MetadataPills';
import { Movie } from '../types';

export function MovieDetailScreen() {
  const route = useRoute<any>();
  const [movie] = useState<Movie | null>(route.params?.movie ?? null);
  const [activeTab, setActiveTab] = useState('info');

  if (!movie) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  const tabs = ['Info', 'History', 'Files'];
  const pills = [movie.minimumAvailability, movie.monitored ? 'Monitored' : 'Unmonitored', `${movie.runtime}min`, movie.path];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroBg} />
        <View style={styles.heroContent}>
          <View style={[styles.poster, { backgroundColor: colors.radarr }]}>
            <Text style={styles.posterText}>{movie.title.slice(0, 2)}</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.subtitle}>{movie.year} · {movie.genres?.slice(0, 2).join(', ')} · {movie.runtime}min</Text>
          </View>
        </View>
      </View>

      <MetadataPills pills={pills} />

      <View style={styles.tabs}>
        {tabs.map(tab => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab.toLowerCase() && styles.tabActive]}
            onPress={() => setActiveTab(tab.toLowerCase())}>
            <Text style={[styles.tabText, activeTab === tab.toLowerCase() && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'info' && (
        <View style={styles.section}>
          <Text style={styles.overview}>{movie.overview}</Text>
          {movie.imdbId && (
            <Pressable style={styles.imdbButton} onPress={() => Linking.openURL(`https://www.imdb.com/title/${movie.imdbId}`)}>
              <Text style={styles.imdbText}>Open in IMDb</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  hero: { height: 200, position: 'relative' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceElevated },
  heroContent: { position: 'absolute', bottom: 16, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  poster: { width: 80, height: 120, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  posterText: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  titleBlock: { flex: 1 },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  section: { padding: spacing.xl },
  overview: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  imdbButton: { backgroundColor: 'rgba(255, 193, 7, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 193, 7, 0.3)', borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  imdbText: { ...typography.bodyBold, color: colors.radarr },
});
