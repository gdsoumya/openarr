import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, RefreshControl } from 'react-native';
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
import { EpisodeSubtitles, SubtitleInfo } from '../types';

export function SeriesSubtitlesScreen() {
  const route = useRoute<any>();
  const { sonarrSeriesId, title, focusEpisodeId } = route.params as { sonarrSeriesId: number; title?: string; focusEpisodeId?: number };
  const config = useServiceConfig('bazarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getBazarrAdapter(config, isLocal) : null), [config, isLocal]);
  const { alert } = useThemedAlert();
  const showToast = useToastStore((s) => s.show);
  const search = useSubtitleSearch();

  const [episodes, setEpisodes] = useState<EpisodeSubtitles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSheet, setActionSheet] = useState<{ visible: boolean; title: string; subtitle?: string; options: ActionSheetOption[] }>({ visible: false, title: '', options: [] });
  const focusedRef = useRef(false);

  const fetch = useCallback(async () => {
    if (!adapter) { setLoading(false); return; }
    try {
      const eps = await adapter.getEpisodeSubtitles(sonarrSeriesId);
      setEpisodes(eps ?? []);
    } catch (e: any) {
      showToast(`Failed to load episodes: ${e.message}`, 'error');
    }
    setLoading(false);
  }, [adapter, sonarrSeriesId]);

  useEffect(() => { fetch(); }, [fetch]);

  const epLabel = (ep: EpisodeSubtitles) =>
    `S${String(ep.season).padStart(2, '0')}E${String(ep.episode).padStart(2, '0')} · ${ep.title}`;

  const searchEpRef = useRef<EpisodeSubtitles | null>(null);

  const openSearch = useCallback((ep: EpisodeSubtitles) => {
    if (!adapter) return;
    searchEpRef.current = ep;
    search.run(epLabel(ep), () => adapter.searchEpisodeSubtitles(ep.sonarrEpisodeId));
  }, [adapter, search]);

  // Deep link from Sonarr episode detail: auto-open search once episodes load
  useEffect(() => {
    if (focusEpisodeId && !focusedRef.current && episodes.length > 0) {
      const ep = episodes.find((e) => e.sonarrEpisodeId === focusEpisodeId);
      if (ep) { focusedRef.current = true; openSearch(ep); }
    }
  }, [episodes, focusEpisodeId, openSearch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      showToast(`${label} done`, 'success');
      fetch();
    } catch (e: any) { alert(`${label} Failed`, e.message); }
  };

  const handleEpisodePress = (ep: EpisodeSubtitles) => {
    if (!adapter) return;
    const options: ActionSheetOption[] = [
      { label: 'Search Subtitles', icon: '🔍', onPress: () => openSearch(ep) },
    ];

    for (const lang of ep.missing_subtitles ?? []) {
      options.push({
        label: `Auto-download ${lang.name}${lang.forced ? ' (forced)' : ''}${lang.hi ? ' (HI)' : ''}`,
        icon: '⬇️',
        onPress: () => runAction('Download', () => adapter.autoDownloadEpisodeSubtitle(sonarrSeriesId, ep.sonarrEpisodeId, lang)),
      });
    }

    for (const sub of (ep.subtitles ?? []).filter((s) => s.path)) {
      options.push({
        label: `Sync ${sub.name}`,
        icon: '⏱',
        onPress: () => runAction('Sync', () => adapter.subtitleAction({
          action: 'sync', language: sub.code2, path: sub.path!, type: 'episode', id: ep.sonarrEpisodeId, forced: sub.forced, hi: sub.hi,
        })),
      });
      for (const target of ep.missing_subtitles ?? []) {
        if (target.code2 === sub.code2) continue;
        options.push({
          label: `Translate ${sub.name} → ${target.name}`,
          icon: '🌐',
          onPress: () => runAction('Translate', () => adapter.subtitleAction({
            action: 'translate', language: target.code2, path: sub.path!, type: 'episode', id: ep.sonarrEpisodeId, forced: target.forced, hi: target.hi,
          })),
        });
      }
      options.push({
        label: `Delete ${sub.name}`,
        icon: '🗑',
        destructive: true,
        onPress: () => alert('Delete Subtitle', `Delete the ${sub.name} subtitle file?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => runAction('Delete', () => adapter.deleteEpisodeSubtitle(sonarrSeriesId, ep.sonarrEpisodeId, sub)) },
        ]),
      });
    }

    setActionSheet({
      visible: true,
      title: epLabel(ep),
      subtitle: (ep.missing_subtitles?.length ?? 0) > 0
        ? `${ep.missing_subtitles.length} missing subtitle${ep.missing_subtitles.length > 1 ? 's' : ''}`
        : 'All subtitles present',
      options,
    });
  };

  const sections = useMemo(() => {
    const bySeason = new Map<number, EpisodeSubtitles[]>();
    for (const ep of episodes) {
      const list = bySeason.get(ep.season) ?? [];
      list.push(ep);
      bySeason.set(ep.season, list);
    }
    return [...bySeason.entries()]
      .sort(([a], [b]) => b - a)
      .map(([season, eps]) => ({ title: `Season ${season}`, data: eps.sort((a, b) => b.episode - a.episode) }));
  }, [episodes]);

  const downloadFromSearch = async (sub: any) => {
    if (!adapter) return;
    const ep = searchEpRef.current;
    if (!ep) return;
    try {
      await adapter.downloadEpisodeSubtitle(sonarrSeriesId, ep.sonarrEpisodeId, sub);
      search.dismiss();
      showToast('Subtitle downloaded', 'success');
      fetch();
    } catch (e: any) { alert('Download Failed', e.message); }
  };

  if (loading) return <LoadingSpinner message="Loading episodes..." />;

  return (
    <>
      <SectionList
        style={styles.container}
        sections={sections}
        keyExtractor={(item) => String(item.sonarrEpisodeId)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: spacing.sm }}
        ListEmptyComponent={<EmptyState icon="📺" title="No episodes" message="Bazarr has no episodes for this series yet." />}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item: ep }) => (
          <Pressable style={styles.row} onPress={() => handleEpisodePress(ep)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.epTitle} numberOfLines={1}>
                <Text style={styles.epNum}>{`E${String(ep.episode).padStart(2, '0')}  `}</Text>
                {ep.title}
              </Text>
              <View style={styles.badges}>
                {(ep.subtitles ?? []).map((s, i) => <SubtitleBadge key={`h${i}`} code={s.code2} has />)}
                {(ep.missing_subtitles ?? []).map((s, i) => <SubtitleBadge key={`m${i}`} code={s.code2} has={false} />)}
                {(ep.subtitles?.length ?? 0) === 0 && (ep.missing_subtitles?.length ?? 0) === 0 && (
                  <Text style={styles.noSubs}>no subtitle languages tracked</Text>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
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
        subtitle={actionSheet.subtitle}
        options={actionSheet.options}
        onClose={() => setActionSheet((p) => ({ ...p, visible: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  sectionHeader: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, backgroundColor: colors.surfaceBase, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  row: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  epTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
  epNum: { color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: spacing.sm },
  noSubs: { ...typography.micro, color: colors.textMuted, fontStyle: 'italic' },
});
