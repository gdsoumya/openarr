import React from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface FilterChip { id: string; label: string; count?: number; }
interface FilterChipsProps { chips: FilterChip[]; activeId: string; onSelect: (id: string) => void; }

export function FilterChips({ chips, activeId, onSelect }: FilterChipsProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.container}>
        {chips.map((chip) => {
          const isActive = chip.id === activeId;
          return (
            <Pressable key={chip.id} style={[styles.chip, isActive && styles.chipActive]} hitSlop={{ top: 8, bottom: 8 }} onPress={() => onSelect(chip.id)} accessibilityRole="button" accessibilityLabel={chip.label} accessibilityState={{ selected: isActive }}>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}{chip.count !== undefined ? ` (${chip.count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 44, marginBottom: spacing.md },
  container: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center', height: 44 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.divider, height: 32, justifyContent: 'center' },
  chipActive: {
    backgroundColor: colors.primaryMuted, borderColor: 'rgba(100,255,218,0.35)',
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3,
  },
  chipText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
});
