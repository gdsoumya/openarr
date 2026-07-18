import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';

interface KeyValueListProps {
  title: string;
  items: Array<{ key: string; value: string }>;
  initiallyExpanded?: boolean;
}

export function KeyValueList({ title, items, initiallyExpanded = false }: KeyValueListProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Pressable style={styles.header} onPress={() => setExpanded((e) => !e)}>
        <Text style={styles.title}>{title} ({items.length})</Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {expanded && items.map(({ key, value }, idx) => (
        <View key={`${key}-${idx}`} style={styles.row}>
          <Text style={styles.key} numberOfLines={1}>{key}</Text>
          <Text style={styles.value} numberOfLines={3} selectable>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  title: { ...typography.bodyBold, color: colors.textPrimary },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  key: { ...typography.micro, color: colors.textMuted, marginBottom: 2 },
  value: { ...typography.caption, color: colors.textSecondary },
});
