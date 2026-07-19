import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { ActionSheet, ActionSheetOption } from '../../../core/components/ActionSheet';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { EmptyState } from '../../../core/components/EmptyState';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useToastStore } from '../../../core/hooks/useToast';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getBazarrAdapter } from '../../adapterFactory';
import { SubtitleBadge } from '../components/SubtitleBadge';
import { SubtitleSearchSheet } from '../components/SubtitleSearchSheet';
import { useSubtitleSearch } from '../hooks';
import { MovieSubtitles } from '../types';

export function MovieSubtitlesScreen() {
  const route = useRoute<any>();
  const { radarrId, title, autoSearch } = route.params as { radarrId: number; title?: string; autoSearch?: boolean };
  const config = useServiceConfig('bazarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getBazarrAdapter(config, isLocal) : null), [config, isLocal]);
  const { alert } = useThemedAlert();
  const showToast = useToastStore((s) => s.show);
  const search = useSubtitleSearch();

  const [movie, setMovie] = useState<MovieSubtitles | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoSearched, setAutoSearched] = useState(false);
  const [actionSheet, setActionSheet] = useState<{ visible: boolean; title: string; options: ActionSheetOption[] }>({ visible: false, title: '', options: [] });

  const fetch = useCallback(async () => {
    if (!adapter) { setLoading(false); return; }
    try {
      setMovie(await adapter.getMovieSubtitles(radarrId));
    } catch (e: any) {
      showToast(`Failed to load movie: ${e.message}`, 'error');
    }
    setLoading(false);
  }, [adapter, radarrId]);

  useEffect(() => { fetch(); }, [fetch]);

  const openSearch = useCallback(() => {
    if (!adapter || !movie) return;
    search.run(movie.title, () => adapter.searchMovieSubtitles(radarrId));
  }, [adapter, movie, radarrId, search]);

  useEffect(() => {
    if (autoSearch && movie && !autoSearched) {
      setAutoSearched(true);
      openSearch();
    }
  }, [autoSearch, movie, autoSearched, openSearch]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      showToast(`${label} done`, 'success');
      fetch();
    } catch (e: any) { alert(`${label} Failed`, e.message); }
  };

  const openActions = () => {
    if (!adapter || !movie) return;
    const options: ActionSheetOption[] = [
      { label: 'Search Subtitles', icon: '🔍', onPress: openSearch },
    ];
    for (const lang of movie.missing_subtitles ?? []) {
      options.push({
        label: `Auto-download ${lang.name}${lang.forced ? ' (forced)' : ''}${lang.hi ? ' (HI)' : ''}`,
        icon: '⬇️',
        onPress: () => runAction('Download', () => adapter.autoDownloadMovieSubtitle(radarrId, lang)),
      });
    }
    for (const sub of (movie.subtitles ?? []).filter((s) => s.path)) {
      options.push({
        label: `Sync ${sub.name}`,
        icon: '⏱',
        onPress: () => runAction('Sync', () => adapter.subtitleAction({
          action: 'sync', language: sub.code2, path: sub.path!, type: 'movie', id: radarrId, forced: sub.forced, hi: sub.hi,
        })),
      });
      for (const target of movie.missing_subtitles ?? []) {
        if (target.code2 === sub.code2) continue;
        options.push({
          label: `Translate ${sub.name} → ${target.name}`,
          icon: '🌐',
          onPress: () => runAction('Translate', () => adapter.subtitleAction({
            action: 'translate', language: target.code2, path: sub.path!, type: 'movie', id: radarrId, forced: target.forced, hi: target.hi,
          })),
        });
      }
      options.push({
        label: `Delete ${sub.name}`,
        icon: '🗑',
        destructive: true,
        onPress: () => alert('Delete Subtitle', `Delete the ${sub.name} subtitle file?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => runAction('Delete', () => adapter.deleteMovieSubtitle(radarrId, sub)) },
        ]),
      });
    }
    setActionSheet({ visible: true, title: movie.title, options });
  };

  const downloadFromSearch = async (sub: any) => {
    if (!adapter) return;
    try {
      await adapter.downloadMovieSubtitle(radarrId, sub);
      search.dismiss();
      showToast('Subtitle downloaded', 'success');
      fetch();
    } catch (e: any) { alert('Download Failed', e.message); }
  };

  if (loading) return <LoadingSpinner message="Loading movie..." />;
  if (!movie) return <EmptyState icon="🎬" title="Movie not found" message="Bazarr has no data for this movie." />;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetch(); setRefreshing(false); }} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>{movie.title}</Text>

        <Text style={styles.sectionTitle}>Subtitles</Text>
        <View style={styles.card}>
          {(movie.subtitles ?? []).filter((s) => s.path).map((sub, i) => (
            <View key={i} style={styles.subRow}>
              <SubtitleBadge code={sub.code2} has />
              <Text style={styles.subName}>{sub.name}{sub.forced ? ' · forced' : ''}{sub.hi ? ' · HI' : ''}</Text>
              <Text style={styles.subPath} numberOfLines={1}>{sub.path?.split('/').pop()}</Text>
            </View>
          ))}
          {(movie.subtitles ?? []).filter((s) => s.path).length === 0 && (
            <Text style={styles.emptyText}>No subtitle files downloaded yet</Text>
          )}
        </View>

        {(movie.missing_subtitles?.length ?? 0) > 0 && (
          <>
            <Text style={styles.sectionTitle}>Missing</Text>
            <View style={styles.card}>
              {movie.missing_subtitles.map((sub, i) => (
                <View key={i} style={styles.subRow}>
                  <SubtitleBadge code={sub.code2} has={false} />
                  <Text style={styles.subName}>{sub.name}{sub.forced ? ' · forced' : ''}{sub.hi ? ' · HI' : ''}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable style={styles.actionsBtn} onPress={openActions}>
          <Text style={styles.actionsBtnText}>Subtitle Actions</Text>
        </Pressable>
      </ScrollView>
      <SubtitleSearchSheet
        visible={search.visible}
        status={search.status}
        error={search.error}
        title={search.title}
        results={search.results}
        onDownload={downloadFromSearch}
        onRetry={search.retry}
        onDismiss={search.dismiss}
      />
      <ActionSheet
        visible={actionSheet.visible}
        title={actionSheet.title}
        options={actionSheet.options}
        onClose={() => setActionSheet((p) => ({ ...p, visible: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subName: { ...typography.caption, color: colors.textPrimary },
  subPath: { ...typography.micro, color: colors.textMuted, flex: 1, textAlign: 'right' },
  emptyText: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  actionsBtn: { marginTop: spacing.xxl, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center' },
  actionsBtnText: { ...typography.bodyBold, color: colors.primary },
});
