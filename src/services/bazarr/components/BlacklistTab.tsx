import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { EmptyState } from '../../../core/components/EmptyState';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useToastStore } from '../../../core/hooks/useToast';
import { BazarrAdapter } from '../adapter';
import { BlacklistItem } from '../types';

type Row = BlacklistItem & { kind: 'episode' | 'movie' };

export function BlacklistTab({ adapter }: { adapter: BazarrAdapter }) {
  const { alert } = useThemedAlert();
  const showToast = useToastStore((s) => s.show);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eps, movs] = await Promise.all([
        adapter.getEpisodeBlacklist().catch(() => []),
        adapter.getMovieBlacklist().catch(() => []),
      ]);
      setRows([
        ...eps.map((e) => ({ ...e, kind: 'episode' as const })),
        ...movs.map((m) => ({ ...m, kind: 'movie' as const })),
      ]);
    } catch (e: any) {
      showToast(`Failed to load blacklist: ${e.message}`, 'error');
    }
    setLoading(false);
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  const remove = (row: Row) => {
    alert('Remove from Blacklist', 'Allow this subtitle to be downloaded again?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        onPress: async () => {
          try {
            if (row.kind === 'episode') await adapter.removeFromEpisodeBlacklist(row.provider, row.subs_id);
            else await adapter.removeFromMovieBlacklist(row.provider, row.subs_id);
            showToast('Removed from blacklist', 'success');
            load();
          } catch (e: any) { alert('Remove Failed', e.message); }
        },
      },
    ]);
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, idx) => `${item.kind}:${item.provider}:${item.subs_id}:${idx}`}
      contentContainerStyle={{ paddingBottom: 20 }}
      ListEmptyComponent={loading ? null : <EmptyState icon="🚫" title="Blacklist empty" message="No subtitles have been blacklisted." />}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.kind === 'episode' ? `${item.seriesTitle ?? ''} ${item.episode_number ?? ''}` : item.title}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.provider}>{item.provider}</Text>
              {item.language?.name ? <Text style={styles.lang}>{item.language.name}</Text> : null}
              <Text style={styles.time}>{item.parsed_timestamp ?? item.timestamp}</Text>
            </View>
          </View>
          <Pressable onPress={() => remove(item)} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle-outline" size={22} color={colors.error} />
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  title: { ...typography.bodyBold, color: colors.textPrimary },
  meta: { flexDirection: 'row', gap: spacing.md, marginTop: 4, flexWrap: 'wrap' },
  provider: { ...typography.micro, color: colors.primary },
  lang: { ...typography.micro, color: colors.bazarr },
  time: { ...typography.micro, color: colors.textMuted },
});
