import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii } from '../theme/tokens';

interface FABProps {
  onPress: () => void;
  style?: ViewStyle;
}

export function FAB({ onPress, style }: FABProps) {
  return (
    <Pressable style={[styles.fab, style]} onPress={onPress}>
      <MaterialCommunityIcons name="plus" size={24} color="#0f1023" />
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
});
