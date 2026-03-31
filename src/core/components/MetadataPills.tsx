import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface MetadataPillsProps { pills: string[]; }

export function MetadataPills({ pills }: MetadataPillsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {pills.map((pill, i) => (
        <View key={i} style={styles.pill}><Text style={styles.text}>{pill}</Text></View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingVertical: spacing.md },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  text: { ...typography.micro, color: colors.textSecondary },
});
