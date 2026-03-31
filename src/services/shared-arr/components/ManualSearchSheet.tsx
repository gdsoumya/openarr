import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { BottomSheetWrapper } from '../../../core/components/BottomSheetWrapper';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { Release } from '../types';

interface ManualSearchSheetProps { visible: boolean; releases: Release[]; onGrab: (release: Release) => void; onDismiss: () => void; }

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

export function ManualSearchSheet({ visible, releases, onGrab, onDismiss }: ManualSearchSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);

  React.useEffect(() => {
    if (visible) sheetRef.current?.snapToIndex(0);
    else sheetRef.current?.close();
  }, [visible]);

  return (
    <BottomSheetWrapper ref={sheetRef} snapPoints={['70%']} onClose={onDismiss}>
      <Text style={styles.title}>Manual Search</Text>
      <FlashList data={releases} estimatedItemSize={80}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => onGrab(item)}>
            <View style={styles.itemHeader}>
              {!item.rejected && <Text style={styles.check}>✓</Text>}
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            </View>
            <View style={styles.itemStats}>
              <Text style={styles.stat}>{item.quality.quality.name}</Text>
              <Text style={styles.stat}>{formatSize(item.size)}</Text>
              <Text style={styles.stat}>{item.indexer}</Text>
              {item.seeders !== undefined && <Text style={styles.stat}>S:{item.seeders}</Text>}
              <Text style={styles.stat}>{item.age}d</Text>
            </View>
          </Pressable>
        )}
        keyExtractor={(item) => item.guid}
      />
    </BottomSheetWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  item: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  itemHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  check: { color: colors.success, fontSize: 14, fontWeight: '700' },
  itemTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, flex: 1, lineHeight: 17 },
  itemStats: { flexDirection: 'row', gap: spacing.md },
  stat: { ...typography.micro, color: colors.textMuted },
});
