import React, { forwardRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, spacing, radii } from '../theme/tokens';

interface BottomSheetWrapperProps { snapPoints: (string | number)[]; children: React.ReactNode; onClose?: () => void; }

export const BottomSheetWrapper = forwardRef<BottomSheet, BottomSheetWrapperProps>(
  ({ snapPoints, children, onClose }, ref) => {
    const renderBackdrop = useCallback(
      (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />, [],
    );
    return (
      <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose onClose={onClose}
        backdropComponent={renderBackdrop} backgroundStyle={styles.background} handleIndicatorStyle={styles.handle}>
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  background: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  handle: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36 },
  content: { padding: spacing.xl },
});
