import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';

interface DetailHeroProps { title: string; subtitle: string; posterUrl?: string; placeholderColor: string; }

export function DetailHero({ title, subtitle, posterUrl, placeholderColor }: DetailHeroProps) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroBg} />
      <View style={styles.heroContent}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.posterPlaceholder, { backgroundColor: placeholderColor }]}>
            <Text style={styles.posterText}>{title.slice(0, 2)}</Text>
          </View>
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, position: 'relative' },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surfaceElevated },
  heroContent: { position: 'absolute', bottom: 16, left: spacing.xl, right: spacing.xl, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  poster: { width: 80, height: 120, borderRadius: radii.md },
  posterPlaceholder: { width: 80, height: 120, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  posterText: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  titleBlock: { flex: 1 },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
