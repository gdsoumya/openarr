import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', visible, onHide, duration = 3000 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide());
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, message, type]);

  if (!visible) return null;

  // Solid tinted surfaces — toasts must stay readable over any background
  const bgColors = { success: '#123830', error: '#3a141f', info: '#10333b' };
  const borderColors = { success: 'rgba(100,255,218,0.45)', error: 'rgba(233,69,96,0.5)', info: 'rgba(63,186,194,0.45)' };
  const textColors = { success: colors.success, error: '#ff9db0', info: '#7fd8de' };
  const icons = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' } as const;

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: bgColors[type], borderColor: borderColors[type] }]}>
      <Ionicons name={icons[type]} size={18} color={textColors[type]} />
      <Text style={[styles.text, { color: textColors[type] }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 100, left: spacing.xl, right: spacing.xl,
    padding: spacing.md, borderRadius: radii.lg, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    zIndex: 999, elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  text: { ...typography.caption, fontWeight: '600', flexShrink: 1 },
});
