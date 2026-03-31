import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { HistoryItem } from '../types';

interface HistoryListProps { items: HistoryItem[]; }

export function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) return <View style={styles.empty}><Text style={styles.emptyText}>No history</Text></View>;

  return (
    <FlashList data={items} estimatedItemSize={64}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>{item.sourceTitle}</Text>
            <Text style={styles.quality}>{item.quality.quality.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.event}>{item.eventType}</Text>
            <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
        </View>
      )}
      keyExtractor={(item) => String(item.id)}
    />
  );
}

const styles = StyleSheet.create({
  item: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  quality: { ...typography.micro, color: colors.primary },
  event: { ...typography.micro, color: colors.textMuted, marginTop: 4 },
  date: { ...typography.micro, color: colors.textMuted, marginTop: 4 },
  empty: { padding: spacing.xxxl, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted },
});
