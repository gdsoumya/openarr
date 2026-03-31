import React from 'react';
import { StyleSheet } from 'react-native';
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
    <FlashList data={data} renderItem={({ item }) => renderItem(item)}
      keyExtractor={(item) => String(item.id)} numColumns={numColumns}
      estimatedItemSize={230} contentContainerStyle={styles.container}
      onEndReached={onEndReached} onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent} />
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});
