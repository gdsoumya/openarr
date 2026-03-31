import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../../../core/theme/tokens';

interface SubtitleBadgeProps { code: string; has: boolean; }

export function SubtitleBadge({ code, has }: SubtitleBadgeProps) {
  return (
    <View style={[styles.badge, has ? styles.has : styles.missing]}>
      <Text style={[styles.text, has ? styles.hasText : styles.missingText]}>{code.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm - 2, marginRight: 4 },
  has: { backgroundColor: 'rgba(168, 85, 247, 0.15)' },
  missing: { backgroundColor: 'rgba(233, 69, 96, 0.1)' },
  text: { fontSize: 9, fontWeight: '600' },
  hasText: { color: colors.bazarr },
  missingText: { color: colors.error },
});
