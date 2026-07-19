import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';

type CarouselStatus = 'loaded' | 'loading' | 'error' | 'empty';

interface CarouselProps {
  title: string;
  accent?: string;
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
  title, accent = colors.primary, count, seeAllLabel = 'See All →', onSeeAll, children,
  status, errorMessage, minHeight = 220,
}: CarouselProps) {
  const empty = !hasChildren(children);
  const showPlaceholder = empty || status === 'loading' || status === 'error';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.accentBar, { backgroundColor: accent, shadowColor: accent }]} />
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {count !== undefined && count > 0 && <Text style={styles.count}>{count}</Text>}
        </View>
        {onSeeAll && !empty && (
          <Pressable style={styles.seeAllBtn} onPress={onSeeAll}><Text style={styles.seeAll}>{seeAllLabel}</Text></Pressable>
        )}
      </View>

      {showPlaceholder ? (
        <View style={[styles.placeholder, { height: minHeight }]}>
          {status === 'loading' && (
            <>
              <Text style={styles.placeholderIcon}>⏳</Text>
              <Text style={styles.placeholderText}>Loading...</Text>
            </>
          )}
          {status === 'error' && (
            <>
              <Text style={styles.placeholderIcon}>⚠️</Text>
              <Text style={styles.placeholderError}>{errorMessage ?? 'Failed to load'}</Text>
            </>
          )}
          {(status === 'empty' || (!status && empty)) && (
            <>
              <Text style={styles.placeholderIcon}>📭</Text>
              <Text style={styles.placeholderText}>No items yet</Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          removeClippedSubviews
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  // Long titles ("Because you added …") ellipsize instead of pushing See All out
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  accentBar: { width: 3, height: 16, borderRadius: 2, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  title: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  count: { ...typography.caption, color: colors.textMuted },
  seeAllBtn: { flexShrink: 0 },
  seeAll: { ...typography.caption, color: colors.primary, fontWeight: '500' },
  scrollContent: { paddingHorizontal: spacing.xl, gap: spacing.md },
  placeholder: {
    marginHorizontal: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 32, marginBottom: spacing.sm, opacity: 0.5 },
  placeholderText: { ...typography.caption, color: colors.textMuted },
  placeholderError: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
