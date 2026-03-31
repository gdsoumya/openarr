import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { SpeedBanner } from '../../../core/components/SpeedBanner';
import { FilterChips } from '../../../core/components/FilterChips';
import { FAB } from '../../../core/components/FAB';
import { TorrentItem } from '../components/TorrentItem';
import { Torrent, TorrentStatus } from '../types';

type FilterId = 'all' | 'downloading' | 'seeding' | 'paused';
const filterMap: Record<FilterId, (t: Torrent) => boolean> = {
  all: () => true,
  downloading: (t) => t.status === TorrentStatus.Downloading || t.status === TorrentStatus.QueuedToDownload,
  seeding: (t) => t.status === TorrentStatus.Seeding || t.status === TorrentStatus.QueuedToSeed,
  paused: (t) => t.status === TorrentStatus.Stopped,
};

export function TorrentListScreen() {
  const [torrents] = useState<Torrent[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = torrents.filter(filterMap[filter]);
  const counts = { all: torrents.length, downloading: torrents.filter(filterMap.downloading).length, seeding: torrents.filter(filterMap.seeding).length, paused: torrents.filter(filterMap.paused).length };
  const chips = [
    { id: 'all', label: 'All', count: counts.all }, { id: 'downloading', label: 'Downloading', count: counts.downloading },
    { id: 'seeding', label: 'Seeding', count: counts.seeding }, { id: 'paused', label: 'Paused', count: counts.paused },
  ];
  const totalDown = torrents.reduce((s, t) => s + t.rateDownload, 0);
  const totalUp = torrents.reduce((s, t) => s + t.rateUpload, 0);
  const fmt = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB/s` : b >= 1024 ? `${(b / 1024).toFixed(0)} KB/s` : `${b} B/s`;

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Torrents</Text></View>
      <SpeedBanner downloadSpeed={fmt(totalDown)} uploadSpeed={fmt(totalUp)} thirdStat={{ value: String(torrents.length), label: 'Total' }} />
      <FilterChips chips={chips} activeId={filter} onSelect={(id) => setFilter(id as FilterId)} />
      <FlashList data={filtered} renderItem={({ item }) => <TorrentItem torrent={item} onPress={() => {}} />}
        keyExtractor={(item) => String(item.id)} estimatedItemSize={120}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setRefreshing(false); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }} />
      <FAB onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
});
