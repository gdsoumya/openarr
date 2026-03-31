import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking, Alert, RefreshControl } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { MetadataPills } from '../../../core/components/MetadataPills';
import { ManualSearchSheet } from '../../shared-arr/components/ManualSearchSheet';
import { CachedImage } from '../../../core/components/CachedImage';
import { ActionSheet, ActionSheetOption } from '../../../core/components/ActionSheet';
import { Movie } from '../types';
import { Release } from '../../shared-arr/types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getRadarrAdapter } from '../../../services/adapterFactory';

export function MovieDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [movie, setMovie] = useState<Movie | null>(route.params?.movie ?? null);
  const [activeTab, setActiveTab] = useState('info');
  const [manualSearchReleases, setManualSearchReleases] = useState<Release[]>([]);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSheet, setActionSheet] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    options: ActionSheetOption[];
  }>({ visible: false, title: '', options: [] });

  const radarrConfig = useServiceConfig('radarr');
  const isLocal = useConnectionStore((s) => s.isLocal);

  const adapter = useMemo(
    () => (radarrConfig ? getRadarrAdapter(radarrConfig, isLocal) : null),
    [radarrConfig, isLocal],
  );

  useEffect(() => {
    async function fetchData() {
      const movieId = route.params?.movieId ?? movie?.id;
      if (!adapter || !movieId) return;
      try {
        const fresh = await adapter.getMovieById(movieId);
        setMovie(fresh);
      } catch (e) {
        console.error('MovieDetail fetch error:', e);
      }
    }
    fetchData();
  }, [adapter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (adapter && movie) {
      try {
        const fresh = await adapter.getMovieById(movie.id);
        setMovie(fresh);
      } catch {}
    }
    setRefreshing(false);
  }, [adapter, movie]);

  // --- Movie actions ---
  function handleSearch() {
    if (!movie) return;
    adapter?.searchMovie(movie.id).catch((e) => console.error('searchMovie error:', e));
  }

  async function handleManualSearch() {
    if (!adapter || !movie) return;
    try {
      const releases = await adapter.manualSearchMovie(movie.id);
      setManualSearchReleases(releases);
      setShowManualSearch(true);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  function handleDelete() {
    if (!movie) return;
    Alert.alert('Delete Movie', `Delete "${movie.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete (keep files)',
        style: 'destructive',
        onPress: async () => {
          try {
            await adapter?.deleteMovie(movie.id, false, false);
            navigation.goBack();
          } catch (e) {
            console.error('deleteMovie error:', e);
          }
        },
      },
      {
        text: 'Delete + Files',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Add to Exclusion List?', 'Also add this movie to the import exclusion list?', [
            {
              text: 'No',
              onPress: async () => {
                try {
                  await adapter?.deleteMovie(movie.id, true, false);
                  navigation.goBack();
                } catch (e) {
                  console.error('deleteMovie error:', e);
                }
              },
            },
            {
              text: 'Yes, Exclude',
              style: 'destructive',
              onPress: async () => {
                try {
                  await adapter?.deleteMovie(movie.id, true, true);
                  navigation.goBack();
                } catch (e) {
                  console.error('deleteMovie error:', e);
                }
              },
            },
          ]);
        },
      },
    ]);
  }

  if (!movie) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  const posterUrl = movie?.images?.find(i => i.coverType === 'poster')?.remoteUrl;
  const fanartUrl = movie?.images?.find(i => i.coverType === 'fanart')?.remoteUrl;

  const tabs = ['Info', 'History', 'Files'];
  const pills = [movie.minimumAvailability, movie.monitored ? 'Monitored' : 'Unmonitored', `${movie.runtime}min`, movie.path];

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
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            {posterUrl ? (
              <CachedImage uri={posterUrl} style={styles.poster} />
            ) : (
              <View style={[styles.posterFallback, { backgroundColor: colors.radarr }]}>
                <Text style={styles.posterText}>{movie.title.slice(0, 2)}</Text>
              </View>
            )}
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

      <View style={styles.actionBar}>
        <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleSearch}>
          <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>{movie.hasFile ? 'Search Upgrade' : 'Search'}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleManualSearch}>
          <Text style={styles.actionBtnText}>Manual Search</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => {
          if (!adapter || !movie) return;
          setActionSheet({
            visible: true,
            title: 'Edit Movie',
            options: [
              {
                label: movie.monitored ? 'Unmonitor' : 'Monitor',
                icon: '👁',
                onPress: async () => {
                  try {
                    const updated = { ...movie, monitored: !movie.monitored };
                    await adapter.editMovie(updated);
                    setMovie(prev => prev ? { ...prev, monitored: !prev.monitored } : prev);
                  } catch (e: any) { Alert.alert('Error', e.message); }
                },
              },
            ],
          });
        }}>
          <Text style={styles.actionBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDelete}>
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
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  scroll: { flex: 1 },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  hero: { height: 200, position: 'relative' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceElevated },
  heroBgImage: { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 16, 35, 0.6)' },
  heroContent: { position: 'absolute', bottom: 16, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  poster: { width: 80, height: 120, borderRadius: radii.md, overflow: 'hidden' },
  posterFallback: { width: 80, height: 120, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
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
  actionBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  actionBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  actionBtnDanger: { backgroundColor: 'rgba(233,69,96,0.08)', borderColor: 'rgba(233,69,96,0.3)' },
  actionBtnText: { ...typography.caption, fontWeight: '600', color: colors.textMuted },
  actionBtnTextPrimary: { color: colors.primary },
  actionBtnTextDanger: { color: '#e94560' },
});
