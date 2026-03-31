import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, radii } from '../theme/tokens';

type BadgeVariant = 'downloading' | 'completed' | 'missing' | 'monitored' | 'inLibrary' | 'custom';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  customColor?: string;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  downloading: { bg: 'rgba(100, 255, 218, 0.9)', text: '#0f1023' },
  completed: { bg: 'rgba(100, 255, 218, 0.15)', text: colors.primary, border: 'rgba(100, 255, 218, 0.3)' },
  missing: { bg: 'rgba(233, 69, 96, 0.9)', text: '#fff' },
  monitored: { bg: 'rgba(63, 186, 194, 0.85)', text: '#fff' },
  inLibrary: { bg: 'rgba(100, 255, 218, 0.9)', text: '#0f1023' },
  custom: { bg: 'rgba(255,255,255,0.1)', text: '#fff' },
};

export function Badge({ label, variant, customColor, style }: BadgeProps) {
  const vs = variantStyles[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: customColor ?? vs.bg },
        vs.border ? { borderWidth: 1, borderColor: vs.border } : undefined,
        style,
      ]}
    >
      <Text style={[styles.text, { color: vs.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: radii.sm },
  text: { ...typography.badge, textTransform: 'uppercase', letterSpacing: 0.3 },
});
