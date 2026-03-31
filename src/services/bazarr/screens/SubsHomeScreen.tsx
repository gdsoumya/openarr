import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, RefreshControl, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
  const insets = useSafeAreaInsets();
  const config = useServiceConfig('bazarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getBazarrAdapter(config, isLocal) : null, [config, isLocal]);

  const [activeTab, setActiveTab] = useState('wantedEp');
  const [wantedEpisodes, setWantedEpisodes] = useState<EpisodeSubtitles[]>([]);
  const [wantedMovies, setWantedMovies] = useState<MovieSubtitles[]>([]);
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
      const [wEp, wMov] = await Promise.all([
        adapter.getWantedEpisodes(),
        adapter.getWantedMovies(),
      ]);
      setWantedEpisodes(wEp.records);
      setWantedMovies(wMov.records);
      setSubsBadgeCount(wEp.records.length + wMov.records.length);
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
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const searchMovieSubs = async (radarrId: number) => {
    if (!adapter) return;
    setSearchingMovieId(radarrId);
    setSearchingEpId(null);
    try {
      const results = await adapter.searchMovieSubtitles(radarrId);
      setSubResults(results);
      subSheetRef.current?.snapToIndex(0);
    } catch (e: any) { Alert.alert('Error', e.message); }
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
      Alert.alert('Success', 'Subtitle downloaded');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const tabs = [
    { id: 'wantedEp', label: 'Episodes', count: wantedEpisodes.length },
    { id: 'wantedMov', label: 'Movies', count: wantedMovies.length },
    { id: 'history', label: 'History' },
    { id: 'providers', label: 'Providers' },
  ];

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}><Text style={styles.title}>Subtitles</Text></View>

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

        {!config && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Bazarr not configured. Add it in Settings to manage subtitles.</Text>
          </View>
        )}

        {config && loading && <LoadingSpinner message="Loading subtitles..." />}

        {config && !loading && activeTab === 'wantedEp' && (
          <FlashList data={wantedEpisodes} estimatedItemSize={80}
            renderItem={({ item }) => (
              <Pressable style={styles.wantedItem} onPress={() => searchEpisodeSubs(item.sonarrEpisodeId)}>
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
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}

        {config && !loading && activeTab === 'wantedMov' && (
          <FlashList data={wantedMovies} estimatedItemSize={80}
            renderItem={({ item }) => (
              <Pressable style={styles.wantedItem} onPress={() => searchMovieSubs(item.radarrId)}>
                <Text style={styles.wantedTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.subRow}>
                  {item.missing_subtitles.map((s, i) => <SubtitleBadge key={i} code={s.code2} has={false} />)}
                </View>
              </Pressable>
            )}
            keyExtractor={(item) => String(item.radarrId)}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No movies missing subtitles</Text></View>}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}

        {activeTab === 'history' && (
          <View style={styles.empty}><Text style={styles.emptyText}>Subtitle history will appear when connected to Bazarr</Text></View>
        )}
        {activeTab === 'providers' && (
          <View style={styles.empty}><Text style={styles.emptyText}>Provider status will appear when connected to Bazarr</Text></View>
        )}
      </View>

      <BottomSheetWrapper ref={subSheetRef} snapPoints={['60%']} onClose={() => { setSubResults([]); setSearchingEpId(null); setSearchingMovieId(null); }}>
        <Text style={styles.sheetTitle}>Subtitle Search Results</Text>
        <FlashList data={subResults} estimatedItemSize={70}
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
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
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
