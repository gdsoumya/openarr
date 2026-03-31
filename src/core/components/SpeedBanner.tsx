import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

interface SpeedBannerProps {
  downloadSpeed: string;
  uploadSpeed: string;
  thirdStat: { value: string; label: string };
}

export function SpeedBanner({ downloadSpeed, uploadSpeed, thirdStat }: SpeedBannerProps) {
  return (
    <View style={styles.container}>
      <StatBlock value={downloadSpeed} label="↓ Download" />
      <View style={styles.divider} />
      <StatBlock value={uploadSpeed} label="↑ Upload" />
      <View style={styles.divider} />
      <StatBlock value={thirdStat.value} label={thirdStat.label} />
    </View>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    backgroundColor: 'rgba(100, 255, 218, 0.04)',
    borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.08)',
    borderRadius: radii.xl, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  divider: { width: 1, height: 32, backgroundColor: colors.divider },
  stat: { alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.textPrimary },
  statLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
});
