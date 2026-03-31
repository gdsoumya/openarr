import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { MetadataPills } from '../../../core/components/MetadataPills';
import { SeasonSection } from '../components/SeasonSection';
import { Series, Episode } from '../types';

export function SeriesDetailScreen() {
  const route = useRoute<any>();
  const [series] = useState<Series | null>(route.params?.series ?? null);
  const [episodes] = useState<Episode[]>([]);
  const [activeTab, setActiveTab] = useState('seasons');

  if (!series) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  const tabs = ['Seasons', 'Calendar', 'History', 'Files'];
  const pills = [series.seriesType, `${series.runtime}min`, series.monitored ? 'Monitored' : 'Unmonitored', series.path];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroBg} />
        <View style={styles.heroContent}>
          <View style={[styles.poster, { backgroundColor: colors.sonarr }]}>
            <Text style={styles.posterText}>{series.title.slice(0, 2)}</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{series.title}</Text>
            <Text style={styles.subtitle}>{series.network} · {series.year} · {series.status}</Text>
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

      {activeTab === 'seasons' && series.seasons?.filter(s => s.seasonNumber > 0).map(season => (
        <SeasonSection key={season.seasonNumber} season={season} episodes={episodes} onEpisodePress={() => {}} />
      ))}
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
});
