import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
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

  const bgColors = { success: 'rgba(100, 255, 218, 0.15)', error: 'rgba(233, 69, 96, 0.15)', info: 'rgba(63, 186, 194, 0.15)' };
  const borderColors = { success: 'rgba(100, 255, 218, 0.3)', error: 'rgba(233, 69, 96, 0.3)', info: 'rgba(63, 186, 194, 0.3)' };
  const textColors = { success: colors.success, error: colors.error, info: colors.info };

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: bgColors[type], borderColor: borderColors[type] }]}>
      <Text style={[styles.text, { color: textColors[type] }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 100, left: spacing.xl, right: spacing.xl,
    padding: spacing.md, borderRadius: radii.md, borderWidth: 1,
    alignItems: 'center', zIndex: 999,
  },
  text: { ...typography.caption, fontWeight: '600' },
});
