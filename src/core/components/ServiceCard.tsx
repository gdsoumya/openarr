import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, typography, serviceConfig, ServiceId } from '../theme/tokens';
import { ServiceIcon } from './ServiceIcon';

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
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <LinearGradient
        colors={[`${svc.color}14`, 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.accent, { backgroundColor: svc.color, shadowColor: svc.color, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 2, height: 0 } }]} />
      <ServiceIcon serviceId={serviceId} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{svc.label}</Text>
        <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.status, { color: connected ? colors.success : colors.error }]}>
          {connected ? '● Connected' : '● Offline'}
        </Text>
        {metric && (
          <>
            <Text
              style={[styles.metricValue, String(metric.value).length > 8 && styles.metricValueSm]}
              numberOfLines={1}
            >
              {metric.value}
            </Text>
            {!!metric.label && <Text style={styles.metricLabel} numberOfLines={1}>{metric.label}</Text>}
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
  cardPressed: { transform: [{ scale: 0.98 }], borderColor: 'rgba(255,255,255,0.12)' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  info: { flex: 1 },
  name: { ...typography.bodyBold, color: colors.textPrimary },
  summary: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  status: { ...typography.micro, fontWeight: '500' },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  // Long values (IP addresses) drop to a compact size so the card never wraps
  metricValueSm: { fontSize: 13, marginTop: 4 },
  metricLabel: { ...typography.badge, color: colors.textMuted },
});
