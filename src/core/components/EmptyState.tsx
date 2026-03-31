import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

interface EmptyStateProps { icon?: string; title: string; message: string; }

export function EmptyState({ icon = '📭', title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  icon: { fontSize: 48, marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
