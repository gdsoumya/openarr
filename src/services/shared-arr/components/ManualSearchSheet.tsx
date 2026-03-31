import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetWrapper } from '../../../core/components/BottomSheetWrapper';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { Release } from '../types';

interface ManualSearchSheetProps {
  visible: boolean;
  releases: Release[];
  onGrab: (release: Release) => void;
  onDismiss: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

export function ManualSearchSheet({ visible, releases, onGrab, onDismiss }: ManualSearchSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const isLoading = visible && releases.length === 0;

  React.useEffect(() => {
    if (visible) sheetRef.current?.snapToIndex(0);
    else sheetRef.current?.close();
  }, [visible]);

  return (
    <BottomSheetWrapper ref={sheetRef} snapPoints={['70%']} onClose={onDismiss}>
      <Text style={styles.title}>Manual Search</Text>
      <Text style={styles.subtitle}>
        {isLoading ? 'Searching indexers...' : `${releases.length} releases found`}
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Querying indexers, this may take a moment...</Text>
        </View>
      ) : (
        <FlashList data={releases} estimatedItemSize={80}
          renderItem={({ item }) => (
            <Pressable style={[styles.item, item.rejected && styles.itemRejected]} onPress={() => {
              if (item.rejected) {
                // Show rejection reasons
                const reasons = item.rejections?.join('\n') ?? 'Unknown reason';
                // Still allow grab but warn
                onGrab(item);
              } else {
                onGrab(item);
              }
            }}>
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
                <Text style={styles.rejectionText} numberOfLines={1}>
                  {item.rejections[0]}
                </Text>
              )}
            </Pressable>
          )}
          keyExtractor={(item) => item.guid}
        />
      )}
    </BottomSheetWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
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
