import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/tokens';

// Consistent home entry point at the left of every tab's top bar
export function DashboardButton() {
  const navigation = useNavigation<any>();
  return (
    <Pressable style={styles.btn} hitSlop={8} onPress={() => navigation.navigate('Dashboard')}>
      <Ionicons name="home-outline" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
});
