import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, spacing, radii, typography } from '../theme/tokens';

export interface ActionSheetOption {
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, subtitle, options, onClose }: ActionSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);

  // Calculate snap point based on content
  const contentHeight = 80 + options.length * 56 + 56; // header + options + cancel
  const snapPoint = Math.min(contentHeight, 500);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={[snapPoint]}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        <View style={styles.options}>
          {options.map((opt, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => { onClose(); setTimeout(opt.onPress, 300); }}
            >
              {opt.icon && <Text style={styles.optionIcon}>{opt.icon}</Text>}
              <Text style={[styles.optionLabel, opt.destructive && styles.optionDestructive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  handle: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg },
  options: { marginTop: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: 2,
  },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  optionIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  optionLabel: { ...typography.body, color: colors.textPrimary },
  optionDestructive: { color: colors.error },
  cancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  cancelText: { ...typography.bodyBold, color: colors.textMuted },
});
