import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { SubtitleBadge } from '../components/SubtitleBadge';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';
import { WantedTab } from '../components/WantedTab';
import { HistoryTab } from '../components/HistoryTab';
import { BlacklistTab } from '../components/BlacklistTab';
import { LanguageProfile, MovieSubtitles, ProviderInfo, SeriesItem } from '../types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getBazarrAdapter } from '../../../services/adapterFactory';

export function SubsHomeScreen() {
  const { alert } = useThemedAlert();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const config = useServiceConfig('bazarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getBazarrAdapter(config, isLocal) : null, [config, isLocal]);
  const showToast = useToastStore((s) => s.show);

  const [activeTab, setActiveTab] = useState('series');
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [movies, setMovies] = useState<MovieSubtitles[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [profiles, setProfiles] = useState<LanguageProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const setSubsBadgeCount = useConnectionStore((s) => s.setSubsBadgeCount);

  const fetchData = useCallback(async () => {
    if (!adapter) { setLoading(false); return; }
    try {
      const [seriesData, moviesData, prov, profs] = await Promise.all([
        adapter.getAllSeries().catch(() => []),
        adapter.getAllMovies().catch(() => []),
        adapter.getProviders().catch(() => []),
        adapter.getLanguageProfiles().catch(() => []),
      ]);
      setSeries(seriesData);
      setMovies(moviesData);
      setProviders(Array.isArray(prov) ? prov : []);
      setProfiles(profs);
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

  const profileName = (profileId: number | null | undefined) =>
    profiles.find((p) => p.profileId === profileId)?.name;

  const resetProviders = () => {
    if (!adapter) return;
    alert('Reset Providers', 'Reset throttled provider states?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          try {
            await adapter.resetProviders();
            showToast('Providers reset', 'success');
            fetchData();
          } catch (e: any) { alert('Reset Failed', e.message); }
        },
      },
    ]);
  };

  const tabs = [
    { id: 'series', label: 'Series', count: series.length },
    { id: 'movies', label: 'Movies', count: movies.length },
    { id: 'wanted', label: 'Wanted' },
    { id: 'history', label: 'History' },
    { id: 'blacklist', label: 'Blacklist' },
    { id: 'providers', label: 'Providers' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}><Text style={styles.title}>Subtitles</Text></View>

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map(tab => (
            <Pressable key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}{'count' in tab && tab.count !== undefined ? ` (${tab.count})` : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabContent}>
        {!config && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Bazarr not configured. Add it in Settings to manage subtitles.</Text>
          </View>
        )}

        {config && loading && <LoadingSpinner message="Loading subtitles..." />}

        {config && adapter && !loading && activeTab === 'series' && (
          <FlatList data={series}
            renderItem={({ item: s }) => (
              <Pressable style={styles.seriesItem}
                onPress={() => navigation.navigate('SubsSeriesDetail', { sonarrSeriesId: s.sonarrSeriesId, title: s.title })}>
                <View style={styles.seriesInfo}>
                  <Text style={styles.seriesTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.seriesMeta}>
                    {s.episodeFileCount ?? 0} episodes · {s.episodeMissingCount ?? 0} missing subs
                    {profileName(s.profileId) ? ` · ${profileName(s.profileId)}` : ''}
                  </Text>
                </View>
                <View style={[styles.seriesStatus, (s.episodeMissingCount ?? 0) > 0 ? styles.seriesStatusWarn : styles.seriesStatusOk]}>
                  <Text style={[styles.seriesStatusText, (s.episodeMissingCount ?? 0) > 0 ? styles.seriesStatusTextWarn : styles.seriesStatusTextOk]}>
                    {(s.episodeMissingCount ?? 0) > 0 ? s.episodeMissingCount : '✓'}
                  </Text>
                </View>
              </Pressable>
            )}
            keyExtractor={(item) => String(item.sonarrSeriesId)}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No series found in Bazarr</Text></View>}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}

        {config && adapter && !loading && activeTab === 'movies' && (
          <FlatList data={movies}
            renderItem={({ item: m }) => (
              <Pressable style={styles.seriesItem}
                onPress={() => navigation.navigate('SubsMovieDetail', { radarrId: m.radarrId, title: m.title })}>
                <View style={styles.seriesInfo}>
                  <Text style={styles.seriesTitle} numberOfLines={1}>{m.title}</Text>
                  <View style={styles.subRow}>
                    {(m.subtitles ?? []).map((s, i) => <SubtitleBadge key={`h${i}`} code={s.code2} has={true} />)}
                    {(m.missing_subtitles ?? []).map((s, i) => <SubtitleBadge key={`m${i}`} code={s.code2} has={false} />)}
                  </View>
                </View>
                <View style={[styles.seriesStatus, (m.missing_subtitles?.length ?? 0) > 0 ? styles.seriesStatusWarn : styles.seriesStatusOk]}>
                  <Text style={[styles.seriesStatusText, (m.missing_subtitles?.length ?? 0) > 0 ? styles.seriesStatusTextWarn : styles.seriesStatusTextOk]}>
                    {(m.missing_subtitles?.length ?? 0) > 0 ? m.missing_subtitles.length : '✓'}
                  </Text>
                </View>
              </Pressable>
            )}
            keyExtractor={(item) => String(item.radarrId)}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No movies found in Bazarr</Text></View>}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}

        {config && adapter && !loading && activeTab === 'wanted' && <WantedTab adapter={adapter} />}
        {config && adapter && !loading && activeTab === 'history' && <HistoryTab adapter={adapter} />}
        {config && adapter && !loading && activeTab === 'blacklist' && <BlacklistTab adapter={adapter} />}

        {config && adapter && !loading && activeTab === 'providers' && (
          <FlatList data={providers}
            ListHeaderComponent={
              <Pressable style={styles.resetBtn} onPress={resetProviders}>
                <Text style={styles.resetBtnText}>Reset Throttled Providers</Text>
              </Pressable>
            }
            renderItem={({ item: p }) => (
              <View style={styles.providerItem}>
                <View>
                  <Text style={styles.providerName}>{p.name}</Text>
                  {p.retry && p.retry !== '-' ? <Text style={styles.providerRetry}>retry {p.retry}</Text> : null}
                </View>
                <View style={styles.providerStatus}>
                  <View style={[styles.providerDot, { backgroundColor: p.status === 'Good' ? colors.success : colors.warning }]} />
                  <Text style={[styles.providerStatusText, { color: p.status === 'Good' ? colors.success : colors.warning }]}>{p.status}</Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No providers configured</Text></View>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  tabContent: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  tabsWrapper: { height: 44, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, height: 44, alignItems: 'center' },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
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
  providerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  providerName: { ...typography.bodyBold, color: colors.textPrimary },
  providerRetry: { ...typography.micro, color: colors.warning, marginTop: 2 },
  providerStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  providerDot: { width: 8, height: 8, borderRadius: 4 },
  providerStatusText: { ...typography.micro, fontWeight: '600' },
  resetBtn: { marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center' },
  resetBtnText: { ...typography.bodyBold, color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
