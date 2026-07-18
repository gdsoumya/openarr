import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { EmptyState } from '../../../core/components/EmptyState';
import { useToastStore } from '../../../core/hooks/useToast';
import { BazarrAdapter } from '../adapter';
import { SubtitleBadge } from './SubtitleBadge';
import { EpisodeSubtitles, MovieSubtitles } from '../types';

const PAGE_SIZE = 25;

export function WantedTab({ adapter }: { adapter: BazarrAdapter }) {
  const navigation = useNavigation<any>();
  const showToast = useToastStore((s) => s.show);
  const [kind, setKind] = useState<'episodes' | 'movies'>('episodes');
  const [episodes, setEpisodes] = useState<EpisodeSubtitles[]>([]);
  const [movies, setMovies] = useState<MovieSubtitles[]>([]);
  const [totals, setTotals] = useState({ episodes: 0, movies: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);

  const load = useCallback(async (nextPage: number, reset = false) => {
    setLoading(true);
    try {
      const [eps, movs] = await Promise.all([
        adapter.getWantedEpisodes(nextPage, PAGE_SIZE),
        adapter.getWantedMovies(nextPage, PAGE_SIZE),
      ]);
      setEpisodes((prev) => reset ? eps.records : [...prev, ...eps.records]);
      setMovies((prev) => reset ? movs.records : [...prev, ...movs.records]);
      setTotals({ episodes: eps.totalRecords, movies: movs.totalRecords });
      setPage(nextPage);
    } catch (e: any) {
      showToast(`Failed to load wanted: ${e.message}`, 'error');
    }
    setLoading(false);
  }, [adapter]);

  useEffect(() => { load(1, true); }, [load]);

  const searchAll = async () => {
    if (searchingAll) return;
    setSearchingAll(true);
    try {
      await adapter.searchAllWanted();
      showToast('Searching all wanted subtitles in the background', 'success');
    } catch (e: any) {
      showToast(`Failed to start search: ${e.message}`, 'error');
    }
    setSearchingAll(false);
  };

  const total = kind === 'episodes' ? totals.episodes : totals.movies;
  const data = kind === 'episodes' ? episodes : movies;
  const hasMore = data.length < total;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {(['episodes', 'movies'] as const).map((k) => (
          <Pressable key={k} style={[styles.segment, kind === k && styles.segmentActive]} onPress={() => setKind(k)}>
            <Text style={[styles.segmentText, kind === k && styles.segmentTextActive]}>
              {k === 'episodes' ? `Episodes (${totals.episodes})` : `Movies (${totals.movies})`}
            </Text>
          </Pressable>
        ))}
        <Pressable style={[styles.searchAllBtn, searchingAll && { opacity: 0.5 }]} onPress={searchAll} disabled={searchingAll}>
          <Text style={styles.searchAllText}>Search All</Text>
        </Pressable>
      </View>

      <FlatList
        data={data as Array<EpisodeSubtitles | MovieSubtitles>}
        keyExtractor={(item: any) => kind === 'episodes' ? `e${item.sonarrEpisodeId}` : `m${item.radarrId}`}
        contentContainerStyle={{ paddingBottom: 20 }}
        onEndReached={() => { if (hasMore && !loading) load(page + 1); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={loading ? null : <EmptyState icon="✅" title="Nothing wanted" message="No missing subtitles — everything is covered." />}
        renderItem={({ item }: any) => (
          <Pressable
            style={styles.row}
            onPress={() => kind === 'episodes'
              ? navigation.navigate('SubsSeriesDetail', { sonarrSeriesId: item.sonarrSeriesId, title: item.seriesTitle, focusEpisodeId: item.sonarrEpisodeId })
              : navigation.navigate('SubsMovieDetail', { radarrId: item.radarrId, title: item.title, autoSearch: true })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {kind === 'episodes' ? `${item.seriesTitle} · ${item.episode_number ?? ''}` : item.title}
              </Text>
              {kind === 'episodes' && item.episodeTitle ? (
                <Text style={styles.rowSub} numberOfLines={1}>{item.episodeTitle}</Text>
              ) : null}
              <View style={styles.badges}>
                {(item.missing_subtitles ?? []).map((s: any, i: number) => <SubtitleBadge key={i} code={s.code2} has={false} />)}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  segment: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  segmentActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  segmentText: { ...typography.micro, color: colors.textMuted },
  segmentTextActive: { color: colors.primary, fontWeight: '600' },
  searchAllBtn: { marginLeft: 'auto', paddingVertical: 5, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  searchAllText: { ...typography.micro, color: colors.primary, fontWeight: '600' },
  row: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowSub: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: spacing.sm },
});
