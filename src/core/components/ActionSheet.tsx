import React, { useRef, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../theme/tokens';

export interface ActionSheetOption {
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

// Legacy emoji icons map to vector icons so every sheet in the app renders
// the modern chip style without touching call sites
const EMOJI_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  '🔍': 'search', '📋': 'list', '🗑': 'trash-outline', '👁': 'eye-outline',
  '💬': 'chatbubble-ellipses-outline', '🎬': 'film-outline', '▶️': 'play',
  '🔄': 'refresh', '⏹': 'stop', '⚡': 'flash-outline', '🖥': 'desktop-outline',
  '⚙️': 'settings-outline', '⬇️': 'download-outline', '⏱': 'time-outline',
  '🌐': 'globe-outline', '🔁': 'swap-horizontal', '✓': 'checkmark',
};

function OptionIcon({ icon, destructive }: { icon: string; destructive?: boolean }) {
  const tint = destructive ? colors.error : colors.primary;
  const bg = destructive ? 'rgba(233,69,96,0.12)' : colors.primaryMuted;
  const name = EMOJI_ICONS[icon.replace(/\uFE0F/g, '')] ?? EMOJI_ICONS[icon];
  return (
    <View style={[styles.iconChip, { backgroundColor: bg }]}>
      {name
        ? <Ionicons name={name} size={16} color={tint} />
        : <Text style={{ fontSize: 14 }}>{icon}</Text>}
    </View>
  );
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
      backgroundComponent={({ style }) => (
        <LinearGradient colors={['#1c2148', '#131634']} style={[style, styles.background]} />
      )}
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
              {opt.icon && <OptionIcon icon={opt.icon} destructive={opt.destructive} />}
              <Text style={[styles.optionLabel, opt.destructive && styles.optionDestructive]}>
                {opt.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.optionChevron} />
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
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: 'hidden',
  },
  handle: { backgroundColor: 'rgba(255,255,255,0.25)', width: 36 },
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
    borderRadius: radii.lg,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.08)', transform: [{ scale: 0.98 }] },
  iconChip: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  optionLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  optionChevron: { opacity: 0.4 },
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
