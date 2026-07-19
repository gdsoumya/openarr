import React, { useRef, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  // Inside a tab navigator the tab bar already clears the phone nav; only
  // pad for the system inset when the sheet sits directly above it
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const bottomPad = (tabBarHeight > 0 ? 0 : insets.bottom) + spacing.lg;

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

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      maxDynamicContentSize={Dimensions.get('window').height * 0.85}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
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
      </BottomSheetScrollView>
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
  content: { paddingHorizontal: spacing.xl },
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
