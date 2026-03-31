import React, { useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { Release } from '../types';

interface ManualSearchSheetProps {
  visible: boolean;
  releases: Release[];
  onGrab: (release: Release) => void;
  onDismiss: () => void;
}

type SortBy = 'seeders' | 'age' | 'size' | 'quality';

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

export function ManualSearchSheet({ visible, releases, onGrab, onDismiss }: ManualSearchSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const [sortBy, setSortBy] = useState<SortBy>('seeders');
  const isLoading = visible && releases.length === 0;

  React.useEffect(() => {
    if (visible) sheetRef.current?.snapToIndex(1); // Open to full height
    else sheetRef.current?.close();
  }, [visible]);

  const sortedReleases = useMemo(() => {
    if (releases.length === 0) return [];
    const sorted = [...releases];
    switch (sortBy) {
      case 'seeders':
        sorted.sort((a, b) => (b.seeders ?? 0) - (a.seeders ?? 0));
        break;
      case 'age':
        sorted.sort((a, b) => a.age - b.age);
        break;
      case 'size':
        sorted.sort((a, b) => b.size - a.size);
        break;
      case 'quality':
        sorted.sort((a, b) => (b.quality?.quality?.name ?? '').localeCompare(a.quality?.quality?.name ?? ''));
        break;
    }
    // Non-rejected first
    sorted.sort((a, b) => (a.rejected ? 1 : 0) - (b.rejected ? 1 : 0));
    return sorted;
  }, [releases, sortBy]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />,
    [],
  );

  const renderItem = useCallback(({ item }: { item: Release }) => (
    <Pressable style={[styles.item, item.rejected && styles.itemRejected]} onPress={() => onGrab(item)}>
      <View style={styles.itemHeader}>
        {!item.rejected && <Text style={styles.check}>✓</Text>}
        {item.rejected && <Text style={styles.rejected}>✕</Text>}
        <Text style={[styles.itemTitle, item.rejected && styles.itemTitleRejected]} numberOfLines={2}>{item.title}</Text>
      </View>
      <View style={styles.itemStats}>
        <Text style={[styles.stat, styles.statQuality]}>{item.quality?.quality?.name ?? '?'}</Text>
        <Text style={styles.stat}>{formatSize(item.size)}</Text>
        <Text style={styles.stat}>{item.indexer}</Text>
        {item.seeders !== undefined && (
          <Text style={[styles.stat, { color: item.seeders > 0 ? colors.success : colors.error }]}>
            S:{item.seeders}
          </Text>
        )}
        {item.leechers !== undefined && <Text style={styles.stat}>L:{item.leechers}</Text>}
        <Text style={styles.stat}>{item.age}d</Text>
        <Text style={[styles.stat, { color: colors.info }]}>{item.protocol}</Text>
      </View>
      {item.rejected && item.rejections && item.rejections.length > 0 && (
        <Text style={styles.rejectionText} numberOfLines={1}>{item.rejections[0]}</Text>
      )}
    </Pressable>
  ), [onGrab]);

  const sortChips: Array<{ id: SortBy; label: string }> = [
    { id: 'seeders', label: 'Seeders' },
    { id: 'age', label: 'Newest' },
    { id: 'size', label: 'Largest' },
    { id: 'quality', label: 'Quality' },
  ];

  const ListHeader = (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Manual Search</Text>
      <Text style={styles.subtitle}>
        {isLoading ? 'Searching indexers...' : `${releases.length} releases found`}
      </Text>
      {!isLoading && releases.length > 0 && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {sortChips.map((chip) => (
            <Pressable
              key={chip.id}
              style={[styles.sortChip, sortBy === chip.id && styles.sortChipActive]}
              onPress={() => setSortBy(chip.id)}
            >
              <Text style={[styles.sortChipText, sortBy === chip.id && styles.sortChipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['50%', '95%']}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      // Open to full height when results arrive
      onChange={(index) => {
        if (index === 0 && sortedReleases.length > 0) {
          sheetRef.current?.snapToIndex(1);
        }
      }}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {ListHeader}
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Querying indexers, this may take a moment...</Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={sortedReleases}
          keyExtractor={(item) => item.guid}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  handle: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36 },
  headerContainer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sortLabel: { ...typography.micro, color: colors.textMuted, marginRight: 2 },
  sortChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  sortChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  sortChipText: { ...typography.micro, color: colors.textMuted },
  sortChipTextActive: { color: colors.primary, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', paddingVertical: 40 },
  loadingText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  item: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  itemRejected: { opacity: 0.5, borderColor: 'rgba(233,69,96,0.15)' },
  itemHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  check: { color: colors.success, fontSize: 14, fontWeight: '700', marginTop: 1 },
  rejected: { color: colors.error, fontSize: 14, fontWeight: '700', marginTop: 1 },
  itemTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, flex: 1, lineHeight: 17 },
  itemTitleRejected: { color: colors.textMuted },
  itemStats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  stat: { ...typography.micro, color: colors.textMuted },
  statQuality: { color: colors.primary, fontWeight: '600' },
  rejectionText: { ...typography.micro, color: colors.error, marginTop: 4, fontStyle: 'italic' },
});
