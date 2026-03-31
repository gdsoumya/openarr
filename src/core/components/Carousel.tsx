import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

interface CarouselProps {
  title: string;
  count?: number;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

export function Carousel({ title, count, seeAllLabel = 'See All →', onSeeAll, children }: CarouselProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {count !== undefined && <Text style={styles.count}>{count}</Text>}
        </View>
        {onSeeAll && <Pressable onPress={onSeeAll}><Text style={styles.seeAll}>{seeAllLabel}</Text></Pressable>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent} decelerationRate="fast">
        {children}
      </ScrollView>
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
});
