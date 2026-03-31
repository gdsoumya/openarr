import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { MetadataPills } from '../../../core/components/MetadataPills';
import { SeasonSection } from '../components/SeasonSection';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { ManualSearchSheet } from '../../shared-arr/components/ManualSearchSheet';
import { Series, Episode, Season } from '../types';
import { Release } from '../../shared-arr/types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getSonarrAdapter } from '../../../services/adapterFactory';

export function SeriesDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [series, setSeries] = useState<Series | null>(route.params?.series ?? null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [activeTab, setActiveTab] = useState('seasons');
  const [manualSearchReleases, setManualSearchReleases] = useState<Release[]>([]);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const sonarrConfig = useServiceConfig('sonarr');
  const isLocal = useConnectionStore((s) => s.isLocal);

  const adapter = useMemo(
    () => (sonarrConfig ? getSonarrAdapter(sonarrConfig, isLocal) : null),
    [sonarrConfig, isLocal],
  );

  useEffect(() => {
    async function fetchData() {
      if (!adapter || !series) { setLoadingEpisodes(false); return; }
      try {
        const eps = await adapter.getEpisodes(series.id);
        setEpisodes(eps);
      } catch (e) {
        console.error('SeriesDetail fetch error:', e);
      }
      setLoadingEpisodes(false);
    }
    fetchData();
  }, [adapter, series]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (adapter && series) {
      try {
        const [freshSeries, eps] = await Promise.all([
          adapter.getSeriesById(series.id),
          adapter.getEpisodes(series.id),
        ]);
        setSeries(freshSeries);
        setEpisodes(eps);
      } catch {}
    }
    setRefreshing(false);
  }, [adapter, series]);

  // --- Episode actions ---
  function handleEpisodePress(episode: Episode) {
    const options: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }> = [
      {
        text: 'Search',
        onPress: () => {
          adapter?.searchEpisode(episode.id).catch((e) => console.error('searchEpisode error:', e));
        },
      },
      {
        text: 'Manual Search',
        onPress: async () => {
          if (!adapter) return;
          try {
            const releases = await adapter.manualSearchEpisode(episode.id);
            setManualSearchReleases(releases);
            setShowManualSearch(true);
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
      {
        text: episode.monitored ? 'Unmonitor' : 'Monitor',
        onPress: () => {
          adapter
            ?.setEpisodeMonitored(episode.id, !episode.monitored)
            .catch((e) => console.error('setEpisodeMonitored error:', e));
        },
      },
    ];

    if (episode.hasFile && episode.episodeFileId != null) {
      options.push({
        text: 'Delete File',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete File', 'Are you sure you want to delete this episode file?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                adapter
                  ?.deleteEpisodeFile(episode.episodeFileId!)
                  .catch((e) => console.error('deleteEpisodeFile error:', e));
              },
            },
          ]);
        },
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(`S${episode.seasonNumber}E${episode.episodeNumber} – ${episode.title}`, undefined, options);
  }

  // --- Season actions ---
  function handleSeasonMenu(season: Season) {
    if (!series) return;
    Alert.alert(`Season ${season.seasonNumber}`, undefined, [
      {
        text: 'Search Season',
        onPress: () => {
          adapter
            ?.searchSeason(series.id, season.seasonNumber)
            .catch((e) => console.error('searchSeason error:', e));
        },
      },
      {
        text: 'Season Cleanup',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Season Cleanup',
            'This will delete all episode files and unmonitor episodes in this season.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clean Up',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const seasonEps = episodes.filter((e) => e.seasonNumber === season.seasonNumber);
                    const fileIds = seasonEps
                      .filter((e) => e.hasFile && e.episodeFileId != null)
                      .map((e) => e.episodeFileId!);
                    const episodeIds = seasonEps.map((e) => e.id);
                    if (fileIds.length > 0) await adapter?.bulkDeleteEpisodeFiles(fileIds);
                    if (episodeIds.length > 0) await adapter?.bulkSetEpisodesMonitored(episodeIds, false);
                  } catch (e) {
                    console.error('Season cleanup error:', e);
                  }
                },
              },
            ],
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // --- Series actions ---
  function handleSearchAll() {
    if (!series) return;
    adapter?.searchSeries(series.id).catch((e) => console.error('searchSeries error:', e));
  }

  function handleDeleteSeries() {
    if (!series) return;
    Alert.alert('Delete Series', `Delete "${series.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete (keep files)',
        style: 'destructive',
        onPress: async () => {
          try {
            await adapter?.deleteSeries(series.id, false);
            navigation.goBack();
          } catch (e) {
            console.error('deleteSeries error:', e);
          }
        },
      },
      {
        text: 'Delete + Files',
        style: 'destructive',
        onPress: async () => {
          try {
            await adapter?.deleteSeries(series.id, true);
            navigation.goBack();
          } catch (e) {
            console.error('deleteSeries error:', e);
          }
        },
      },
    ]);
  }

  if (!series) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  const tabs = ['Seasons', 'Calendar', 'History', 'Files'];
  const pills = [series.seriesType, `${series.runtime}min`, series.monitored ? 'Monitored' : 'Unmonitored', series.path];

  return (
    <>
    <View style={styles.container}>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
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

        {activeTab === 'seasons' && loadingEpisodes && <LoadingSpinner message="Loading episodes..." />}
        {activeTab === 'seasons' && !loadingEpisodes && series.seasons?.filter(s => s.seasonNumber > 0).map(season => (
          <SeasonSection
            key={season.seasonNumber}
            season={season}
            episodes={episodes}
            onEpisodePress={handleEpisodePress}
            onSeasonMenu={() => handleSeasonMenu(season)}
          />
        ))}
      </ScrollView>

      <View style={styles.actionBar}>
        <Pressable style={styles.actionBtn} onPress={() => {
          if (!adapter || !series) return;
          Alert.alert('Edit Series', 'Toggle monitoring?', [
            { text: 'Cancel', style: 'cancel' },
            { text: series.monitored ? 'Unmonitor' : 'Monitor', onPress: async () => {
              try {
                const updated = { ...series, monitored: !series.monitored };
                await adapter.editSeries(updated);
                setSeries(prev => prev ? { ...prev, monitored: !prev.monitored } : prev);
              } catch (e: any) { Alert.alert('Error', e.message); }
            }},
          ]);
        }}>
          <Text style={styles.actionBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleSearchAll}>
          <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Search All</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDeleteSeries}>
          <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Delete</Text>
        </Pressable>
      </View>
    </View>
    <ManualSearchSheet
      visible={showManualSearch}
      releases={manualSearchReleases}
      onGrab={async (release) => {
        if (!adapter) return;
        try {
          await adapter.grabRelease(release.guid, release.indexerId);
          Alert.alert('Success', 'Release grabbed');
          setShowManualSearch(false);
        } catch (e: any) { Alert.alert('Error', e.message); }
      }}
      onDismiss={() => setShowManualSearch(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  scroll: { flex: 1 },
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
  actionBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  actionBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  actionBtnDanger: { backgroundColor: 'rgba(233,69,96,0.08)', borderColor: 'rgba(233,69,96,0.3)' },
  actionBtnText: { ...typography.caption, fontWeight: '600', color: colors.textMuted },
  actionBtnTextPrimary: { color: colors.primary },
  actionBtnTextDanger: { color: '#e94560' },
});
