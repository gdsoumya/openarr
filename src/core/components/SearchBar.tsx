import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface SearchBarProps { placeholder: string; value: string; onChangeText: (text: string) => void; onSubmit?: () => void; }

export function SearchBar({ placeholder, value, onChangeText, onSubmit }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={colors.textMuted}
        value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} returnKeyType="search" autoCapitalize="none" autoCorrect={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.lg, paddingHorizontal: spacing.lg },
  input: { ...typography.body, color: colors.textPrimary, paddingVertical: 11 },
});
