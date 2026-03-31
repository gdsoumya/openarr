import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

type CarouselStatus = 'loaded' | 'loading' | 'error' | 'empty';

interface CarouselProps {
  title: string;
  count?: number;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
  status?: CarouselStatus;
  errorMessage?: string;
  minHeight?: number;
}

function hasChildren(children: React.ReactNode): boolean {
  const arr = React.Children.toArray(children);
  return arr.length > 0;
}

export function Carousel({
  title, count, seeAllLabel = 'See All →', onSeeAll, children,
  status, errorMessage, minHeight = 220,
}: CarouselProps) {
  const empty = !hasChildren(children);
  const showPlaceholder = empty || status === 'loading' || status === 'error';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {count !== undefined && count > 0 && <Text style={styles.count}>{count}</Text>}
        </View>
        {onSeeAll && !empty && (
          <Pressable onPress={onSeeAll}><Text style={styles.seeAll}>{seeAllLabel}</Text></Pressable>
        )}
      </View>

      {showPlaceholder ? (
        <View style={[styles.placeholder, { minHeight }]}>
          {status === 'loading' && (
            <Text style={styles.placeholderText}>Loading...</Text>
          )}
          {status === 'error' && (
            <>
              <Text style={styles.placeholderIcon}>⚠️</Text>
              <Text style={styles.placeholderError}>{errorMessage ?? 'Failed to load'}</Text>
            </>
          )}
          {(status === 'empty' || (!status && empty)) && (
            <Text style={styles.placeholderText}>No items</Text>
          )}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  title: { ...typography.h3, color: colors.textPrimary },
  count: { ...typography.caption, color: colors.textMuted },
  seeAll: { ...typography.caption, color: colors.primary, fontWeight: '500' },
  scrollContent: { paddingHorizontal: spacing.xl, gap: spacing.md },
  placeholder: {
    marginHorizontal: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  placeholderIcon: { fontSize: 24, marginBottom: spacing.sm },
  placeholderText: { ...typography.caption, color: colors.textMuted },
  placeholderError: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
