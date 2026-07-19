import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { spacing } from '../theme/tokens';

interface PosterGridProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactElement;
  numColumns?: number;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ReactElement;
}

export function PosterGrid<T extends { id: string | number }>({
  data, renderItem, numColumns = 3, onEndReached, ListHeaderComponent,
}: PosterGridProps<T>) {
  return (
    <FlashList data={data} renderItem={({ item }) => <View style={styles.cell}>{renderItem(item)}</View>}
      keyExtractor={(item) => String(item.id)} numColumns={numColumns}
      contentContainerStyle={styles.container}
      onEndReached={onEndReached} onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent} />
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  // Cells are equal-width; centering the card splits leftover space evenly
  cell: { alignItems: 'center' },
});
