import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { QueueItem } from '../types';

interface QueueListProps { items: QueueItem[]; }

export function QueueList({ items }: QueueListProps) {
  if (items.length === 0) return <View style={styles.empty}><Text style={styles.emptyText}>Queue is empty</Text></View>;

  return (
    <FlashList data={items} estimatedItemSize={80}
      renderItem={({ item }) => {
        const progress = item.size > 0 ? (item.size - item.sizeleft) / item.size : 0;
        return (
          <View style={styles.item}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <ProgressBar progress={progress} style={styles.progress} />
            <View style={styles.stats}>
              <Text style={styles.stat}>{(progress * 100).toFixed(1)}%</Text>
              <Text style={styles.stat}>{item.timeleft || '—'}</Text>
              <Text style={styles.stat}>{item.status}</Text>
            </View>
          </View>
        );
      }}
      keyExtractor={(item) => String(item.id)}
    />
  );
}

const styles = StyleSheet.create({
  item: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  title: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  progress: { marginBottom: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.lg },
  stat: { ...typography.micro, color: colors.textMuted },
  empty: { padding: spacing.xxxl, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted },
});
