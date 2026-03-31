import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../theme/tokens';

interface ProgressBarProps {
  progress: number;
  variant?: 'download' | 'seed';
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, variant = 'download', height = 4, style }: ProgressBarProps) {
  const fillColor = variant === 'download' ? colors.primary : colors.sonarr;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height }, style]}>
      <View style={[styles.fill, { width: `${clampedProgress * 100}%`, backgroundColor: fillColor, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radii.sm, overflow: 'hidden' },
  fill: { borderRadius: radii.sm },
});
