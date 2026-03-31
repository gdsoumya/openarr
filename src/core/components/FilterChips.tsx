import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface FilterChip { id: string; label: string; count?: number; }
interface FilterChipsProps { chips: FilterChip[]; activeId: string; onSelect: (id: string) => void; }

export function FilterChips({ chips, activeId, onSelect }: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {chips.map((chip) => {
        const isActive = chip.id === activeId;
        return (
          <Pressable key={chip.id} style={[styles.chip, isActive && styles.chipActive]} onPress={() => onSelect(chip.id)}>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {chip.label}{chip.count !== undefined ? ` (${chip.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  chipText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
});
