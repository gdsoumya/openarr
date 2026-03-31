import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface ErrorStateProps { message: string; onRetry: () => void; }

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.button} onPress={onRetry}><Text style={styles.buttonText}>Retry</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  icon: { fontSize: 48, marginBottom: spacing.lg },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  button: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: radii.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  buttonText: { ...typography.bodyBold, color: colors.primary },
});
