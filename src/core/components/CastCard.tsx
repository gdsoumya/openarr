import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';
import { CachedImage } from './CachedImage';

interface CastCardProps {
  name: string;
  role?: string;
  imageUrl?: string;
  onPress: () => void;
}

export function CastCard({ name, role, imageUrl, onPress }: CastCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageUrl ? (
        <CachedImage uri={imageUrl} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>{name.slice(0, 2)}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      {role ? <Text style={styles.role} numberOfLines={1}>{role}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 90 },
  image: { width: 90, height: 90, borderRadius: radii.round, backgroundColor: colors.surfaceElevated },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.15)' },
  name: { ...typography.micro, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  role: { ...typography.badge, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
});
