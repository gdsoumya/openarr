import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';
import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';
import { CachedImage } from './CachedImage';

type PosterSize = 'sm' | 'md' | 'lg' | 'xl';
const posterWidths: Record<PosterSize, number> = { sm: 90, md: 120, lg: 130, xl: 150 };

interface PosterCardProps {
  title: string;
  subtitle?: string;
  posterUrl?: string;
  placeholderText?: string;
  size?: PosterSize;
  badge?: { label: string; variant: 'downloading' | 'completed' | 'missing' | 'monitored' | 'inLibrary' };
  progress?: number;
  bottomLabel?: string;
  rating?: number;
  onPress: () => void;
  style?: ViewStyle;
}

export function PosterCard({
  title, subtitle, posterUrl, placeholderText, size = 'lg',
  badge, progress, bottomLabel, rating, onPress, style,
}: PosterCardProps) {
  const width = posterWidths[size];
  const height = width * 1.5;

  return (
    <Pressable style={[{ width }, style]} onPress={onPress}>
      <View style={[styles.poster, { width, height }]}>
        {posterUrl ? (
          <CachedImage uri={posterUrl} style={styles.posterImage as any} />
        ) : (
          <View style={[styles.placeholder, { width, height }]}>
            <Text style={styles.placeholderText}>{placeholderText ?? title.slice(0, 3)}</Text>
          </View>
        )}
        {badge && <View style={styles.badgePosition}><Badge label={badge.label} variant={badge.variant} /></View>}
        {rating !== undefined && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {rating.toFixed(1)}</Text>
          </View>
        )}
        {bottomLabel && (
          <View style={styles.bottomOverlay}>
            <Text style={styles.bottomLabel}>{bottomLabel}</Text>
          </View>
        )}
        {progress !== undefined && progress < 1 && (
          <View style={styles.progressPosition}>
            <ProgressBar progress={progress} height={3} />
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  poster: { borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  posterImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceElevated },
  placeholderText: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.15)' },
  badgePosition: { position: 'absolute', top: 8, right: 8 },
  ratingBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.sm },
  ratingText: { ...typography.badge, color: colors.radarr },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomLabel: { ...typography.badge, color: '#fff' },
  progressPosition: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  title: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 17 },
  subtitle: { ...typography.badge, color: colors.textMuted, marginTop: 3 },
});
