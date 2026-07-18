import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme/tokens';

// Consistent top-right entry point to the dashboard from every tab
export function DashboardButton() {
  const navigation = useNavigation<any>();
  return (
    <Pressable style={styles.btn} hitSlop={8} onPress={() => navigation.navigate('Dashboard')}>
      <MaterialCommunityIcons name="view-dashboard-outline" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: spacing.sm },
});
