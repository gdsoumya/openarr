import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { alert } = useThemedAlert();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortBy | null>(null);
  const isLoading = visible && releases.length === 0;

  const sortedReleases = useMemo(() => {
    if (releases.length === 0) return [];
    if (!sortBy) return releases; // No sort selected — return original order from server
    const sorted = [...releases];
    switch (sortBy) {
      case 'seeders': sorted.sort((a, b) => (b.seeders ?? 0) - (a.seeders ?? 0)); break;
      case 'age': sorted.sort((a, b) => a.age - b.age); break;
      case 'size': sorted.sort((a, b) => b.size - a.size); break;
      case 'quality': sorted.sort((a, b) => (b.quality?.quality?.name ?? '').localeCompare(a.quality?.quality?.name ?? '')); break;
    }
    sorted.sort((a, b) => (a.rejected ? 1 : 0) - (b.rejected ? 1 : 0));
    return sorted;
  }, [releases, sortBy]);

  const confirmGrab = (item: Release) => {
    const info = [
      item.quality?.quality?.name,
      formatSize(item.size),
      item.indexer,
      item.seeders !== undefined ? `${item.seeders} seeders` : null,
      `${item.age}d old`,
    ].filter(Boolean).join(' · ');

    alert(
      'Download Release',
      `${item.title}\n\n${info}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => onGrab(item) },
      ],
    );
  };

  const sortChips: Array<{ id: SortBy; label: string }> = [
    { id: 'seeders', label: 'Seeders' },
    { id: 'age', label: 'Newest' },
    { id: 'size', label: 'Largest' },
    { id: 'quality', label: 'Quality' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Manual Search</Text>
            <Text style={styles.subtitle}>
              {isLoading ? 'Searching indexers...' : `${releases.length} releases found`}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onDismiss}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>

        {/* Sort chips */}
        {!isLoading && releases.length > 0 && (
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort:</Text>
            {sortChips.map((chip) => (
              <Pressable
                key={chip.id}
                style={[styles.sortChip, sortBy === chip.id && styles.sortChipActive]}
                onPress={() => setSortBy(prev => prev === chip.id ? null : chip.id)}
              >
                <Text style={[styles.sortChipText, sortBy === chip.id && styles.sortChipTextActive]}>
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Querying indexers, this may take a moment...</Text>
          </View>
        )}

        {/* Results */}
        {!isLoading && (
          <FlatList
            data={sortedReleases}
            keyExtractor={(item) => item.guid}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable style={[styles.item, item.rejected && styles.itemRejected]} onPress={() => confirmGrab(item)}>
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
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  closeBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  closeBtnText: { ...typography.bodyBold, color: colors.primary },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  sortLabel: { ...typography.micro, color: colors.textMuted },
  sortChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  sortChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  sortChipText: { ...typography.micro, color: colors.textMuted },
  sortChipTextActive: { color: colors.primary, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
  listContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, paddingBottom: 40 },
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
