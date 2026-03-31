import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { SubtitleBadge } from '../components/SubtitleBadge';
import { EpisodeSubtitles, MovieSubtitles } from '../types';

export function SubsHomeScreen() {
  const [activeTab, setActiveTab] = useState('wantedEp');
  const [wantedEpisodes] = useState<EpisodeSubtitles[]>([]);
  const [wantedMovies] = useState<MovieSubtitles[]>([]);

  const tabs = [
    { id: 'wantedEp', label: 'Episodes', count: wantedEpisodes.length },
    { id: 'wantedMov', label: 'Movies', count: wantedMovies.length },
    { id: 'history', label: 'History' },
    { id: 'providers', label: 'Providers' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Subtitles</Text></View>

      <View style={styles.tabs}>
        {tabs.map(tab => (
          <Pressable key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}{'count' in tab ? ` (${tab.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'wantedEp' && (
        <FlashList data={wantedEpisodes} estimatedItemSize={80}
          renderItem={({ item }) => (
            <Pressable style={styles.wantedItem}>
              <Text style={styles.wantedTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.wantedSub}>S{String(item.season).padStart(2, '0')}E{String(item.episode).padStart(2, '0')}</Text>
              <View style={styles.subRow}>
                {item.missing_subtitles.map((s, i) => <SubtitleBadge key={i} code={s.code2} has={false} />)}
              </View>
            </Pressable>
          )}
          keyExtractor={(item) => String(item.sonarrEpisodeId)}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No episodes missing subtitles</Text></View>}
        />
      )}

      {activeTab === 'wantedMov' && (
        <FlashList data={wantedMovies} estimatedItemSize={80}
          renderItem={({ item }) => (
            <Pressable style={styles.wantedItem}>
              <Text style={styles.wantedTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.subRow}>
                {item.missing_subtitles.map((s, i) => <SubtitleBadge key={i} code={s.code2} has={false} />)}
              </View>
            </Pressable>
          )}
          keyExtractor={(item) => String(item.radarrId)}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No movies missing subtitles</Text></View>}
        />
      )}

      {activeTab === 'history' && (
        <View style={styles.empty}><Text style={styles.emptyText}>Subtitle history will appear when connected to Bazarr</Text></View>
      )}
      {activeTab === 'providers' && (
        <View style={styles.empty}><Text style={styles.emptyText}>Provider status will appear when connected to Bazarr</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing.md },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  wantedItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  wantedTitle: { ...typography.bodyBold, color: colors.textPrimary },
  wantedSub: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  subRow: { flexDirection: 'row', marginTop: spacing.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { ...typography.body, color: colors.textMuted },
});
