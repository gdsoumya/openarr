import React from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface SearchBarProps { placeholder: string; value: string; onChangeText: (text: string) => void; onSubmit?: () => void; }

export function SearchBar({ placeholder, value, onChangeText, onSubmit }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={16} color={colors.textMuted} style={styles.icon} />
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor={colors.textMuted}
        value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} returnKeyType="search" autoCapitalize="none" autoCorrect={false} />
      {value.length > 0 && (
        <Pressable style={styles.clearBtn} onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.sm },
  input: { ...typography.body, color: colors.textPrimary, paddingVertical: 11, flex: 1 },
  clearBtn: { padding: spacing.xs },
});
