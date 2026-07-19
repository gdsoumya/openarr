import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { MetadataPills } from '../../../core/components/MetadataPills';
import { SeasonSection } from '../components/SeasonSection';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { ManualSearchSheet } from '../../shared-arr/components/ManualSearchSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from '../../../core/components/CachedImage';
import { ActionSheet, ActionSheetOption } from '../../../core/components/ActionSheet';
import { Series, Episode, Season } from '../types';
import { useReleaseSearch } from '../../shared-arr/hooks';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getSonarrAdapter } from '../../../services/adapterFactory';
import { useServerStore } from '../../../stores/serverStore';
import { useToastStore } from '../../../core/hooks/useToast';
import { openInEmby } from '../../emby/openInEmby';
import { RatingsBar } from '../../../core/components/RatingsBar';
import { MediaInfo } from '../../../core/components/MediaInfo';
import { OMDBRatings } from '../../omdb/client';
import { fetchOMDBRatings } from '../../omdb/fetchRatings';
import { WatchProviderCountry } from '../../tmdb/types';
import { tmdb } from '../../tmdb/instance';

export function SeriesDetailScreen() {
  const { alert } = useThemedAlert();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [series, setSeries] = useState<Series | null>(route.params?.series ?? null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [episodeQueueMap, setEpisodeQueueMap] = useState<Map<number, number>>(new Map()); // episodeId → progress %
  const [activeTab, setActiveTab] = useState('seasons');
  const releaseSearch = useReleaseSearch();
  const [refreshing, setRefreshing] = useState(false);
  const [omdbRatings, setOmdbRatings] = useState<OMDBRatings | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [watchProviders, setWatchProviders] = useState<WatchProviderCountry | undefined>();
  const [calendarItems, setCalendarItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [episodeFiles, setEpisodeFiles] = useState<any[]>([]);
  const [actionSheet, setActionSheet] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    options: ActionSheetOption[];
  }>({ visible: false, title: '', options: [] });

  const sonarrConfig = useServiceConfig('sonarr');
  const embyConfig = useServerStore((s) => s.getServiceConfig('emby'));
  const isLocal = useConnectionStore((s) => s.isLocal);
  const showToast = useToastStore((s) => s.show);

  const adapter = useMemo(
    () => (sonarrConfig ? getSonarrAdapter(sonarrConfig, isLocal) : null),
    [sonarrConfig, isLocal],
  );

  // Fetch OMDB ratings + watch providers
  useEffect(() => {
    if (series) {
      setRatingsLoading(true);
      // For TV, we don't have tmdbId directly — search TMDB to get it
      const getTmdbId = async (): Promise<number | undefined> => {
        const result = await tmdb.searchTV(series.title, 1).catch(() => ({ results: [] }));
        return result.results?.[0]?.id;
      };
      getTmdbId().then(async (foundTmdbId) => {
        // Fetch OMDB ratings
        fetchOMDBRatings({ imdbId: series.imdbId, tmdbId: foundTmdbId, title: series.title, year: series.year, type: 'tv' })
          .then(setOmdbRatings).finally(() => setRatingsLoading(false));
        // Fetch watch providers
        if (foundTmdbId) {
          tmdb.getTVWatchProviders(foundTmdbId).then((providers) => {
            setWatchProviders(providers['US'] ?? providers['GB'] ?? Object.values(providers)[0]);
          }).catch(() => {});
        }
      });
    }
  }, [series?.imdbId, series?.title]);

  useEffect(() => {
    async function fetchData() {
      if (!adapter || !series) { setLoadingEpisodes(false); return; }
      try {
        const [eps, queueResult] = await Promise.all([
          adapter.getEpisodes(series.id),
          adapter.getQueue(1, 50).catch(() => ({ records: [], totalRecords: 0, page: 1, pageSize: 50 })),
        ]);
        setEpisodes(eps);
        // Build episode queue map
        const qm = new Map<number, number>();
        for (const qi of queueResult.records) {
          const epId = (qi as any).episodeId;
          if (epId) {
            const progress = qi.size > 0 ? ((qi.size - qi.sizeleft) / qi.size) * 100 : 0;
            qm.set(epId, progress);
          }
        }
        setEpisodeQueueMap(qm);
      } catch (e) {
        console.error('SeriesDetail fetch error:', e);
      }
      setLoadingEpisodes(false);
    }
    fetchData();
  }, [adapter, series]);

  useEffect(() => {
    if (!adapter || !series) return;
    if (activeTab === 'calendar') {
      const now = new Date();
      const start = now.toISOString();
      const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      adapter.getCalendar(start, end).then(setCalendarItems).catch(() => {});
    } else if (activeTab === 'history') {
      adapter.getSeriesHistory(series.id).then(items => setHistoryItems(items ?? [])).catch(() => {});
    } else if (activeTab === 'files') {
      adapter.getEpisodeFiles(series.id).then(setEpisodeFiles).catch(() => {});
    }
  }, [activeTab, adapter, series]);

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
    const isAired = episode.airDateUtc ? new Date(episode.airDateUtc) < new Date() : false;
    const options: ActionSheetOption[] = [];

    if (episode.hasFile) {
      // Downloaded — offer search for better quality and delete
      options.push({
        label: 'Search Better Quality',
        icon: '🔍',
        onPress: () => {
          if (!adapter) return;
          releaseSearch.run(
            { type: 'episode', label: `S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')} · ${episode.title}` },
            () => adapter.manualSearchEpisode(episode.id),
          );
        },
      });
      options.push({
        label: 'Search Subtitles',
        icon: '💬',
        onPress: () => {
          const bazarrConfig = useServerStore.getState().getServiceConfig('bazarr');
          if (!bazarrConfig) { alert('Bazarr Not Configured', 'Set up Bazarr in Settings to search subtitles.'); return; }
          if (!series) return;
          // Bazarr keys on Sonarr IDs directly
          navigation.navigate('Subs', {
            screen: 'SubsSeriesDetail',
            params: { sonarrSeriesId: series.id, title: series.title, focusEpisodeId: episode.id },
          });
        },
      });
      options.push({
        label: 'Delete File',
        icon: '🗑',
        destructive: true,
        onPress: () => {
          alert('Delete File', `Delete file for S${String(episode.seasonNumber).padStart(2,'0')}E${String(episode.episodeNumber).padStart(2,'0')}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => adapter?.deleteEpisodeFile(episode.episodeFileId!).then(onRefresh).catch(e => alert('Error', e.message)) },
          ]);
        },
      });
    } else if (isAired) {
      // Missing — offer search
      options.push({
        label: 'Auto Search',
        icon: '🔍',
        onPress: async () => {
          if (!adapter) return;
          try {
            await adapter.searchEpisode(episode.id);
            alert('Search Started', 'Sonarr is searching indexers for this episode. Check Activity for progress.');
          } catch (e: any) { alert('Search Failed', e.message); }
        },
      });
      options.push({
        label: 'Manual Search',
        icon: '📋',
        onPress: () => {
          if (!adapter) return;
          releaseSearch.run(
            { type: 'episode', label: `S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')} · ${episode.title}` },
            () => adapter.manualSearchEpisode(episode.id),
          );
        },
      });
    }

    // Always offer monitor toggle
    options.push({
      label: episode.monitored ? 'Unmonitor' : 'Monitor',
      icon: '👁',
      onPress: () => adapter?.setEpisodeMonitored(episode.id, !episode.monitored).then(onRefresh).catch(e => alert('Error', e.message)),
    });

    const subtitle = episode.hasFile
      ? `✓ Downloaded${episode.episodeFile ? ` · ${episode.episodeFile.quality?.quality?.name ?? ''}` : ''}`
      : isAired ? '✕ Missing' : `Airs ${episode.airDateUtc ? new Date(episode.airDateUtc).toLocaleDateString() : 'TBA'}`;

    setActionSheet({
      visible: true,
      title: `S${String(episode.seasonNumber).padStart(2,'0')}E${String(episode.episodeNumber).padStart(2,'0')} · ${episode.title}`,
      subtitle,
      options,
    });
  }

  // --- Season actions ---
  function handleSeasonMenu(season: Season) {
    if (!series) return;
    setActionSheet({
      visible: true,
      title: `Season ${season.seasonNumber}`,
      options: [
        {
          label: 'Auto Search Season',
          icon: '🔍',
          onPress: async () => {
            try {
              await adapter?.searchSeason(series.id, season.seasonNumber);
              alert('Search Started', `Searching indexers for all episodes in Season ${season.seasonNumber}.`);
            } catch (e: any) { alert('Search Failed', e.message); }
          },
        },
        {
          label: 'Manual Search Season',
          icon: '📋',
          onPress: () => {
            if (!adapter) return;
            releaseSearch.run(
              { type: 'season', label: `Season ${season.seasonNumber} · ${series.title}` },
              () => adapter.manualSearchSeason(series.id, season.seasonNumber),
            );
          },
        },
        {
          label: 'Season Cleanup',
          icon: '🗑',
          destructive: true,
          onPress: () => {
            alert(
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
      ],
    });
  }

  // --- Series actions ---
  async function handleSearchAll() {
    if (!adapter || !series) return;
    try {
      await adapter.searchSeries(series.id);
      alert('Search Started', `Sonarr is now searching indexers for all episodes of "${series.title}". Check the Activity tab in Sonarr for progress.`);
    } catch (e: any) {
      alert('Search Failed', e.message);
    }
  }

  function handleDeleteSeries() {
    if (!series) return;
    alert('Delete Series', `Delete "${series.title}"?`, [
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

  const posterUrl = series?.images?.find(i => i.coverType === 'poster')?.remoteUrl;
  const fanartUrl = series?.images?.find(i => i.coverType === 'fanart')?.remoteUrl;

  const tabs = ['Seasons', 'Calendar', 'History', 'Files'];
  const pills = [series.seriesType, `${series.runtime}min`, series.monitored ? 'Monitored' : 'Unmonitored', series.path];

  return (
    <>
    <View style={styles.container}>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.hero}>
          {fanartUrl ? (
            <CachedImage uri={fanartUrl} style={styles.heroBgImage} />
          ) : (
            <View style={styles.heroBg} />
          )}
          <LinearGradient
            colors={['rgba(15,16,35,0.25)', 'rgba(15,16,35,0.55)', colors.surfaceBase]}
            locations={[0, 0.65, 1]}
            style={styles.heroOverlay}
          />
          <View style={styles.heroContent}>
            {posterUrl ? (
              <CachedImage uri={posterUrl} style={styles.poster} />
            ) : (
              <View style={[styles.posterFallback, { backgroundColor: colors.sonarr }]}>
                <Text style={styles.posterText}>{series.title.slice(0, 2)}</Text>
              </View>
            )}
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{series.title}</Text>
              <Text style={styles.subtitle}>{series.network} · {series.year} · {series.status}</Text>
            </View>
          </View>
        </View>

        <MetadataPills pills={pills} />
        <RatingsBar ratings={omdbRatings} loading={ratingsLoading} title={series.title} imdbId={series.imdbId} type="tv" />
        <MediaInfo
          releaseDate={series.firstAired}
          status={series.status}
          network={series.network}
          originCountry={undefined}
          originalLanguage={undefined}
          genres={undefined}
          runtime={series.runtime}
          seasonCount={series.seasonCount}
          episodeCount={series.totalEpisodeCount}
          watchProviders={watchProviders}
        />

        <View style={styles.tabsWrapper}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map(tab => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab.toLowerCase() && styles.tabActive]}
              onPress={() => setActiveTab(tab.toLowerCase())}>
              <Text style={[styles.tabText, activeTab === tab.toLowerCase() && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView></View>

        {activeTab === 'seasons' && loadingEpisodes && <LoadingSpinner message="Loading episodes..." />}
        {activeTab === 'seasons' && !loadingEpisodes && series.seasons?.filter(s => s.seasonNumber > 0).map(season => (
          <SeasonSection
            key={season.seasonNumber}
            season={season}
            episodes={episodes}
            onEpisodePress={handleEpisodePress}
            onSeasonMenu={() => handleSeasonMenu(season)}
            episodeQueueMap={episodeQueueMap}
          />
        ))}

        {activeTab === 'calendar' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {calendarItems.length === 0 && <View style={styles.emptyTab}><Text style={styles.emptyTabText}>No upcoming episodes</Text></View>}
            {calendarItems.map((item, idx) => (
              <View key={idx} style={styles.calendarItem}>
                <Text style={styles.calendarTitle}>{item.title}</Text>
                <Text style={styles.calendarDate}>{item.airDateUtc ? new Date(item.airDateUtc).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBA'}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'history' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {historyItems.length === 0 && <View style={styles.emptyTab}><Text style={styles.emptyTabText}>No history</Text></View>}
            {historyItems.map((item, idx) => (
              <View key={idx} style={styles.historyItem}>
                <Text style={styles.historyTitle} numberOfLines={1}>{item.sourceTitle}</Text>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyEvent}>{item.eventType}</Text>
                  <Text style={styles.historyQuality}>{item.quality?.quality?.name ?? ''}</Text>
                  <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'files' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {episodeFiles.length === 0 && <View style={styles.emptyTab}><Text style={styles.emptyTabText}>No files</Text></View>}
            {episodeFiles.map((file, idx) => (
              <View key={idx} style={styles.fileItem}>
                <Text style={styles.fileName} numberOfLines={2}>{file.path?.split('/').pop() ?? 'Unknown'}</Text>
                <View style={styles.fileMeta}>
                  <Text style={styles.fileQuality}>{file.quality?.quality?.name ?? ''}</Text>
                  <Text style={styles.fileSize}>{file.size ? `${(file.size / 1073741824).toFixed(2)} GB` : ''}</Text>
                  <Text style={styles.fileLang}>{file.language?.name ?? ''}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <View style={styles.actionBar}>
        {(series.statistics?.episodeFileCount ?? 0) > 0 && embyConfig && (
          <Pressable style={styles.actionBtn} onPress={async () => {
            const err = await openInEmby('Series', { tvdbId: series.tvdbId, imdbId: series.imdbId, tmdbId: series.tmdbId });
            if (err) showToast(err, 'error');
          }}>
            <MaterialCommunityIcons name="play" size={20} color={colors.emby} />
          </Pressable>
        )}
        <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleSearchAll}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialCommunityIcons name="magnify" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Search All</Text>
          </View>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => {
          if (!adapter || !series) return;
          setActionSheet({
            visible: true,
            title: 'Manage',
            options: [
              { label: series.monitored ? 'Unmonitor' : 'Monitor', icon: '👁', onPress: async () => {
                try {
                  const updated = { ...series, monitored: !series.monitored };
                  await adapter.editSeries(updated);
                  setSeries(prev => prev ? { ...prev, monitored: !prev.monitored } : prev);
                } catch (e: any) { alert('Error', e.message); }
              }},
              { label: 'Delete Series', icon: '🗑', onPress: () => handleDeleteSeries(), destructive: true },
            ],
          });
        }}>
          <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
    <ManualSearchSheet
      visible={releaseSearch.visible}
      status={releaseSearch.status}
      error={releaseSearch.error}
      releases={releaseSearch.releases}
      context={releaseSearch.context}
      onGrab={async (release) => {
        if (!adapter) return;
        try {
          await adapter.grabRelease(release.guid, release.indexerId);
          showToast('Release grabbed', 'success');
          releaseSearch.dismiss();
        } catch (e: any) { alert('Error', e.message); }
      }}
      onRetry={releaseSearch.retry}
      onDismiss={releaseSearch.dismiss}
    />
    <ActionSheet
      visible={actionSheet.visible}
      title={actionSheet.title}
      subtitle={actionSheet.subtitle}
      options={actionSheet.options}
      onClose={() => setActionSheet(prev => ({ ...prev, visible: false }))}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  hero: { height: 200, position: 'relative' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceElevated },
  heroBgImage: { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: StyleSheet.absoluteFillObject,
  heroContent: { position: 'absolute', bottom: 16, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  poster: { width: 80, height: 120, borderRadius: radii.md, overflow: 'hidden' },
  posterFallback: { width: 80, height: 120, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  posterText: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  titleBlock: { flex: 1 },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  tabsWrapper: { height: 44, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, height: 44, alignItems: 'center' },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  actionBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  actionBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder, flex: 2 },
  actionBtnText: { ...typography.bodyBold, color: colors.textMuted },
  actionBtnTextPrimary: { color: colors.primary },
  emptyTab: { padding: spacing.xxxl, alignItems: 'center' },
  emptyTabText: { ...typography.body, color: colors.textMuted },
  calendarItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calendarTitle: { ...typography.bodyBold, color: colors.textPrimary, flex: 1, marginRight: spacing.md },
  calendarDate: { ...typography.caption, color: colors.primary },
  historyItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  historyTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
  historyMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  historyEvent: { ...typography.micro, color: colors.textMuted },
  historyQuality: { ...typography.micro, color: colors.primary },
  historyDate: { ...typography.micro, color: colors.textMuted },
  fileItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  fileName: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
  fileMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  fileQuality: { ...typography.micro, color: colors.primary },
  fileSize: { ...typography.micro, color: colors.textMuted },
  fileLang: { ...typography.micro, color: colors.bazarr },
});
