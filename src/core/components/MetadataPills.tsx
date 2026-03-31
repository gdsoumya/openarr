import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface MetadataPillsProps { pills: string[]; }

export function MetadataPills({ pills }: MetadataPillsProps) {
  if (pills.length === 0) return null;
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.container}>
        {pills.map((pill, i) => (
          <View key={i} style={styles.pill}><Text style={styles.text}>{pill}</Text></View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 38, marginBottom: spacing.xs },
  container: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center', height: 38 },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider, height: 26, justifyContent: 'center' },
  text: { ...typography.micro, color: colors.textSecondary },
});
