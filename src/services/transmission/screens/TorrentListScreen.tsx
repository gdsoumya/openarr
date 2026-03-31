import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../../core/theme/tokens';

export function TorrentListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Torrents</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
});
