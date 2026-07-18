import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { EmptyState } from '../../../core/components/EmptyState';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useToastStore } from '../../../core/hooks/useToast';
import { BazarrAdapter } from '../adapter';
import { SubHistoryItem } from '../types';

const PAGE_SIZE = 25;

export function HistoryTab({ adapter }: { adapter: BazarrAdapter }) {
  const { alert } = useThemedAlert();
  const showToast = useToastStore((s) => s.show);
  const [kind, setKind] = useState<'episodes' | 'movies'>('episodes');
  const [items, setItems] = useState<SubHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextPage: number, reset = false) => {
    setLoading(true);
    try {
      const result = kind === 'episodes'
        ? await adapter.getEpisodeHistory(nextPage, PAGE_SIZE)
        : await adapter.getMovieHistory(nextPage, PAGE_SIZE);
      setItems((prev) => reset ? result.records : [...prev, ...result.records]);
      setTotal(result.totalRecords);
      setPage(nextPage);
    } catch (e: any) {
      showToast(`Failed to load history: ${e.message}`, 'error');
    }
    setLoading(false);
  }, [adapter, kind]);

  useEffect(() => { load(1, true); }, [load]);

  const blacklist = (item: SubHistoryItem) => {
    if (!item.provider || !item.subs_id || !item.language) {
      showToast('This history entry cannot be blacklisted', 'error');
      return;
    }
    alert('Blacklist Subtitle', 'Blacklist this subtitle and search for a replacement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Blacklist',
        style: 'destructive',
        onPress: async () => {
          try {
            if (kind === 'episodes') {
              await adapter.blacklistEpisodeSubtitle({
                seriesid: item.sonarrSeriesId!, episodeid: item.sonarrEpisodeId!,
                provider: item.provider, subs_id: item.subs_id!,
                language: item.language!.code2, subtitles_path: item.subtitles_path ?? '',
              });
            } else {
              await adapter.blacklistMovieSubtitle({
                radarrid: item.radarrId!, provider: item.provider, subs_id: item.subs_id!,
                language: item.language!.code2, subtitles_path: item.subtitles_path ?? '',
              });
            }
            showToast('Subtitle blacklisted', 'success');
            load(1, true);
          } catch (e: any) { alert('Blacklist Failed', e.message); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {(['episodes', 'movies'] as const).map((k) => (
          <Pressable key={k} style={[styles.segment, kind === k && styles.segmentActive]} onPress={() => setKind(k)}>
            <Text style={[styles.segmentText, kind === k && styles.segmentTextActive]}>
              {k === 'episodes' ? 'Episodes' : 'Movies'}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item, idx) => `${item.id}:${idx}`}
        contentContainerStyle={{ paddingBottom: 20 }}
        onEndReached={() => { if (items.length < total && !loading) load(page + 1); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={loading ? null : <EmptyState icon="🕘" title="No history" message="No subtitle activity recorded yet." />}
        renderItem={({ item: h }) => (
          <Pressable style={styles.item} onLongPress={() => blacklist(h)}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {kind === 'episodes' ? `${h.seriesTitle ?? ''} ${h.episode_number ?? ''}` : h.title}
              </Text>
              {h.blacklisted && <Text style={styles.blacklistedFlag}>blacklisted</Text>}
            </View>
            <Text style={styles.desc} numberOfLines={2}>{h.description}</Text>
            <View style={styles.meta}>
              {h.provider ? <Text style={styles.provider}>{h.provider}</Text> : null}
              {h.language?.name ? <Text style={styles.lang}>{h.language.name}</Text> : null}
              {h.score != null && h.score !== '' ? <Text style={styles.score}>{h.score}</Text> : null}
              <Text style={styles.time}>{h.parsed_timestamp ?? h.timestamp}</Text>
            </View>
            {h.provider && h.subs_id ? <Text style={styles.hint}>Long-press to blacklist</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  segment: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  segmentActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  segmentText: { ...typography.micro, color: colors.textMuted },
  segmentTextActive: { color: colors.primary, fontWeight: '600' },
  item: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  itemTitle: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  blacklistedFlag: { ...typography.badge, color: colors.error, textTransform: 'uppercase' },
  desc: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  meta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
  provider: { ...typography.micro, color: colors.primary },
  lang: { ...typography.micro, color: colors.bazarr },
  score: { ...typography.micro, color: colors.success },
  time: { ...typography.micro, color: colors.textMuted },
  hint: { ...typography.micro, color: colors.textMuted, marginTop: 4, fontStyle: 'italic', opacity: 0.6 },
});
