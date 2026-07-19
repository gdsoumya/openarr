import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii } from '../theme/tokens';

interface FABProps {
  onPress: () => void;
  style?: ViewStyle;
  label?: string;
}

export function FAB({ onPress, style, label = 'Add' }: FABProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.92 }] }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={[colors.primary, '#3fbac2']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#0f1023" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 52, height: 52,
    borderRadius: radii.xl,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },
  gradient: { width: '100%', height: '100%', borderRadius: radii.xl, justifyContent: 'center', alignItems: 'center' },
});
