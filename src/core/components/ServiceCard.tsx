import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radii, typography, serviceConfig, ServiceId } from '../theme/tokens';

interface ServiceCardProps {
  serviceId: ServiceId;
  summary: string;
  connected: boolean;
  metric?: { value: string | number; label: string };
  onPress: () => void;
}

export function ServiceCard({ serviceId, summary, connected, metric, onPress }: ServiceCardProps) {
  const svc = serviceConfig[serviceId];
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.accent, { backgroundColor: svc.color }]} />
      <View style={[styles.icon, { backgroundColor: svc.color }]}>
        <Text style={styles.iconText}>{svc.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{svc.label}</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.status, { color: connected ? colors.success : colors.error }]}>
          {connected ? '● Connected' : '● Offline'}
        </Text>
        {metric && (
          <>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, marginHorizontal: spacing.xl, marginBottom: spacing.sm,
    backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder,
    borderRadius: radii.xl, position: 'relative', overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  icon: { width: 44, height: 44, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  iconText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { ...typography.bodyBold, color: colors.textPrimary },
  summary: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  status: { ...typography.micro, fontWeight: '500' },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  metricLabel: { ...typography.badge, color: colors.textMuted },
});
