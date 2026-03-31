import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../theme/tokens';

interface FABProps {
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
}

export function FAB({ onPress, icon = '+', style }: FABProps) {
  return (
    <Pressable style={[styles.fab, style]} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 90, right: 20, width: 52, height: 52,
    backgroundColor: colors.primary, borderRadius: radii.xl,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  icon: { fontSize: 24, color: '#0f1023', fontWeight: '300' },
});
