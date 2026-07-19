import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

interface LoadingSpinnerProps { message?: string; }

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  message: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
});
