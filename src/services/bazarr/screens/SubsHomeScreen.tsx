import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, ScrollView, FlatList } from 'react-native';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import BottomSheet from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { SubtitleBadge } from '../components/SubtitleBadge';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { BottomSheetWrapper } from '../../../core/components/BottomSheetWrapper';
import { EpisodeSubtitles, MovieSubtitles, SubtitleSearchResult } from '../types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getBazarrAdapter } from '../../../services/adapterFactory';

export function SubsHomeScreen() {
  const { alert } = useThemedAlert();
  const insets = useSafeAreaInsets();
  const config = useServiceConfig('bazarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getBazarrAdapter(config, isLocal) : null, [config, isLocal]);

  const [activeTab, setActiveTab] = useState('series');
  const [series, setSeries] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setSubsBadgeCount = useConnectionStore((s) => s.setSubsBadgeCount);

  const [subResults, setSubResults] = useState<SubtitleSearchResult[]>([]);
  const [searchingEpId, setSearchingEpId] = useState<number | null>(null);
  const [searchingMovieId, setSearchingMovieId] = useState<number | null>(null);
  const subSheetRef = useRef<BottomSheet>(null);

  const fetchData = useCallback(async () => {
    if (!adapter) { setLoading(false); return; }
    try {
      const [seriesData, moviesData, hist, prov] = await Promise.all([
        adapter.getAllSeries().catch(() => []),
        adapter.getAllMovies().catch(() => []),
        adapter.getEpisodeHistory().catch(() => ({ records: [] })),
        adapter.getProviders().catch(() => []),
      ]);
      setSeries(seriesData);
      setMovies(moviesData);
      setHistory(hist.records ?? []);
      setProviders(Array.isArray(prov) ? prov : []);
      const wantedEps = seriesData.reduce((sum: number, s: any) => sum + (s.episodeMissingCount ?? 0), 0);
      const wantedMovs = moviesData.filter((m: any) => (m.missing_subtitles?.length ?? 0) > 0).length;
      setSubsBadgeCount(wantedEps + wantedMovs);
    } catch (e) {
      console.error('Bazarr fetch error:', e);
    }
    setLoading(false);
  }, [adapter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const searchEpisodeSubs = async (episodeId: number) => {
    if (!adapter) return;
    setSearchingEpId(episodeId);
    setSearchingMovieId(null);
    try {
      const results = await adapter.searchEpisodeSubtitles(episodeId);
      setSubResults(results);
      subSheetRef.current?.snapToIndex(0);
    } catch (e: any) { alert('Error', e.message); }
  };

  const searchMovieSubs = async (radarrId: number) => {
    if (!adapter) return;
    setSearchingMovieId(radarrId);
    setSearchingEpId(null);
    try {
      const results = await adapter.searchMovieSubtitles(radarrId);
      setSubResults(results);
      subSheetRef.current?.snapToIndex(0);
    } catch (e: any) { alert('Error', e.message); }
  };

  const downloadSub = async (sub: SubtitleSearchResult) => {
    if (!adapter) return;
    try {
      if (searchingEpId) {
        await adapter.downloadEpisodeSubtitle({ episodeid: searchingEpId, ...sub });
      } else if (searchingMovieId) {
        await adapter.downloadMovieSubtitle({ radarrid: searchingMovieId, ...sub });
      }
      subSheetRef.current?.close();
      alert('Success', 'Subtitle downloaded');
    } catch (e: any) { alert('Error', e.message); }
  };

  const tabs = [
    { id: 'series', label: 'Series', count: series.length },
    { id: 'movies', label: 'Movies', count: movies.length },
    { id: 'history', label: 'History' },
    { id: 'providers', label: 'Providers' },
  ];

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}><Text style={styles.title}>Subtitles</Text></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.tabs}>
          {tabs.map(tab => (
            <Pressable key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}{'count' in tab ? ` (${tab.count})` : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.tabContent}>
        {!config && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Bazarr not configured. Add it in Settings to manage subtitles.</Text>
          </View>
        )}

        {config && loading && <LoadingSpinner message="Loading subtitles..." />}

        {config && !loading && activeTab === 'series' && (
          <FlatList data={series}
            renderItem={({ item: s }) => (
              <View style={styles.seriesItem}>
                <View style={styles.seriesInfo}>
                  <Text style={styles.seriesTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.seriesMeta}>
                    {s.episodeFileCount ?? 0} episodes · {s.episodeMissingCount ?? 0} missing subs
                  </Text>
                </View>
                <View style={[styles.seriesStatus, (s.episodeMissingCount ?? 0) > 0 ? styles.seriesStatusWarn : styles.seriesStatusOk]}>
                  <Text style={[styles.seriesStatusText, (s.episodeMissingCount ?? 0) > 0 ? styles.seriesStatusTextWarn : styles.seriesStatusTextOk]}>
                    {(s.episodeMissingCount ?? 0) > 0 ? s.episodeMissingCount : '✓'}
                  </Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => String(item.sonarrSeriesId)}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No series found in Bazarr</Text></View>}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}

        {config && !loading && activeTab === 'movies' && (
          <FlatList data={movies}
            renderItem={({ item: m }) => (
              <View style={styles.seriesItem}>
                <View style={styles.seriesInfo}>
                  <Text style={styles.seriesTitle} numberOfLines={1}>{m.title}</Text>
                  <View style={styles.subRow}>
                    {(m.subtitles ?? []).map((s: any, i: number) => <SubtitleBadge key={`h${i}`} code={s.code2} has={true} />)}
                    {(m.missing_subtitles ?? []).map((s: any, i: number) => <SubtitleBadge key={`m${i}`} code={s.code2} has={false} />)}
                  </View>
                </View>
                <View style={[styles.seriesStatus, (m.missing_subtitles?.length ?? 0) > 0 ? styles.seriesStatusWarn : styles.seriesStatusOk]}>
                  <Text style={[styles.seriesStatusText, (m.missing_subtitles?.length ?? 0) > 0 ? styles.seriesStatusTextWarn : styles.seriesStatusTextOk]}>
                    {(m.missing_subtitles?.length ?? 0) > 0 ? m.missing_subtitles.length : '✓'}
                  </Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => String(item.radarrId)}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No movies found in Bazarr</Text></View>}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}

        {activeTab === 'history' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {history.length === 0 && <View style={styles.empty}><Text style={styles.emptyText}>No subtitle history yet</Text></View>}
            {history.map((h, idx) => (
              <View key={idx} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{h.seriesTitle ?? h.title}</Text>
                  <Text style={styles.historyEp}>{h.episode_number ?? ''}</Text>
                </View>
                <Text style={styles.historyDesc} numberOfLines={2}>{h.description}</Text>
                <View style={styles.historyMeta}>
                  {h.provider && <Text style={styles.historyProvider}>{h.provider}</Text>}
                  {h.language?.name && <Text style={styles.historyLang}>{h.language.name}</Text>}
                  {h.score && <Text style={styles.historyScore}>{h.score}</Text>}
                  <Text style={styles.historyTime}>{h.timestamp}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        {activeTab === 'providers' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {providers.length === 0 && <View style={styles.empty}><Text style={styles.emptyText}>No providers configured</Text></View>}
            {providers.map((p) => (
              <View key={p.name} style={styles.providerItem}>
                <Text style={styles.providerName}>{p.name}</Text>
                <View style={styles.providerStatus}>
                  <View style={[styles.providerDot, { backgroundColor: p.status === 'Good' ? colors.success : colors.warning }]} />
                  <Text style={[styles.providerStatusText, { color: p.status === 'Good' ? colors.success : colors.warning }]}>{p.status}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        </View>
      </View>

      <BottomSheetWrapper ref={subSheetRef} snapPoints={['60%']} onClose={() => { setSubResults([]); setSearchingEpId(null); setSearchingMovieId(null); }}>
        <Text style={styles.sheetTitle}>Subtitle Search Results</Text>
        <FlatList data={subResults}
          renderItem={({ item: sub }) => (
            <Pressable style={styles.subResultItem} onPress={() => downloadSub(sub)}>
              <View style={styles.subResultRow}>
                <Text style={styles.subProvider}>{sub.provider}</Text>
                <Text style={styles.subScore}>Score: {sub.score}</Text>
              </View>
              <Text style={styles.subRelease} numberOfLines={1}>{sub.release_info?.join(', ') || 'Unknown release'}</Text>
              <View style={styles.subResultRow}>
                <Text style={styles.subLang}>{sub.language}</Text>
                <View style={styles.subResultRow}>
                  {sub.hi && <Text style={styles.subFlag}>HI</Text>}
                  {sub.forced && <Text style={styles.subFlag}>Forced</Text>}
                </View>
              </View>
            </Pressable>
          )}
          keyExtractor={(_, idx) => String(idx)}
          ListEmptyComponent={<Text style={styles.emptyText}>No subtitles found</Text>}
        />
      </BottomSheetWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  tabContent: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing.md },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  // Series/Movie list items
  seriesItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md },
  seriesInfo: { flex: 1 },
  seriesTitle: { ...typography.bodyBold, color: colors.textPrimary },
  seriesMeta: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  seriesStatus: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  seriesStatusOk: { backgroundColor: 'rgba(100, 255, 218, 0.2)', borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.3)' },
  seriesStatusWarn: { backgroundColor: 'rgba(233, 69, 96, 0.2)', borderWidth: 1, borderColor: 'rgba(233, 69, 96, 0.3)' },
  seriesStatusText: { fontSize: 12, fontWeight: '700' },
  seriesStatusTextOk: { color: colors.success },
  seriesStatusTextWarn: { color: colors.error },
  subRow: { flexDirection: 'row', marginTop: spacing.sm, flexWrap: 'wrap', gap: 2 },
  // History items
  historyItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { ...typography.bodyBold, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  historyEp: { ...typography.micro, color: colors.textMuted },
  historyDesc: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  historyMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
  historyProvider: { ...typography.micro, color: colors.primary },
  historyLang: { ...typography.micro, color: colors.bazarr },
  historyScore: { ...typography.micro, color: colors.success },
  historyTime: { ...typography.micro, color: colors.textMuted },
  // Provider items
  providerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  providerName: { ...typography.bodyBold, color: colors.textPrimary },
  providerStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  providerDot: { width: 8, height: 8, borderRadius: 4 },
  providerStatusText: { ...typography.micro, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
  sheetTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md, paddingHorizontal: spacing.xl },
  subResultItem: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  subResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subProvider: { ...typography.bodyBold, color: colors.textPrimary },
  subScore: { ...typography.micro, color: colors.primary },
  subRelease: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  subLang: { ...typography.micro, color: colors.bazarr, marginTop: 4 },
  subFlag: { ...typography.badge, color: colors.textMuted, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
});
