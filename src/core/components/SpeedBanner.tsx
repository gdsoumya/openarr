import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface SpeedBannerProps {
  downloadSpeed: string;
  uploadSpeed: string;
  thirdStat: { value: string; label: string };
}

export function SpeedBanner({ downloadSpeed, uploadSpeed, thirdStat }: SpeedBannerProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(100,255,218,0.08)', 'rgba(63,186,194,0.02)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <StatBlock value={downloadSpeed} label="↓ Download" tint={colors.primary} />
      <View style={styles.divider} />
      <StatBlock value={uploadSpeed} label="↑ Upload" tint={colors.info} />
      <View style={styles.divider} />
      <StatBlock value={thirdStat.value} label={thirdStat.label} />
    </View>
  );
}

function StatBlock({ value, label, tint }: { value: string; label: string; tint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tint ? { color: tint } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.12)',
    borderRadius: radii.xl, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    overflow: 'hidden',
  },
  divider: { width: 1, height: 32, backgroundColor: colors.divider },
  stat: { alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.textPrimary },
  statLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
});
