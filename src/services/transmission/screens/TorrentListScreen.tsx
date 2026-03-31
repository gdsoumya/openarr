import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { SpeedBanner } from '../../../core/components/SpeedBanner';
import { FilterChips } from '../../../core/components/FilterChips';
import { FAB } from '../../../core/components/FAB';
import { TorrentItem } from '../components/TorrentItem';
import { Torrent, TorrentStatus } from '../types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getTransmissionAdapter } from '../../../services/adapterFactory';
import { usePolling } from '../../../core/hooks/usePolling';

type FilterId = 'all' | 'downloading' | 'seeding' | 'paused';
const filterMap: Record<FilterId, (t: Torrent) => boolean> = {
  all: () => true,
  downloading: (t) => t.status === TorrentStatus.Downloading || t.status === TorrentStatus.QueuedToDownload,
  seeding: (t) => t.status === TorrentStatus.Seeding || t.status === TorrentStatus.QueuedToSeed,
  paused: (t) => t.status === TorrentStatus.Stopped,
};

export function TorrentListScreen() {
  const config = useServiceConfig('transmission');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getTransmissionAdapter(config, isLocal) : null, [config, isLocal]);

  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTorrents = useCallback(async () => {
    if (!adapter) return;
    try {
      const data = await adapter.getTorrents();
      setTorrents(data);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch torrents:', e);
      setLoading(false);
    }
  }, [adapter]);

  usePolling(fetchTorrents, 3000, !!adapter);

  const filtered = torrents.filter(filterMap[filter]);
  const counts = {
    all: torrents.length,
    downloading: torrents.filter(filterMap.downloading).length,
    seeding: torrents.filter(filterMap.seeding).length,
    paused: torrents.filter(filterMap.paused).length,
  };
  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'downloading', label: 'Downloading', count: counts.downloading },
    { id: 'seeding', label: 'Seeding', count: counts.seeding },
    { id: 'paused', label: 'Paused', count: counts.paused },
  ];
  const totalDown = torrents.reduce((s, t) => s + t.rateDownload, 0);
  const totalUp = torrents.reduce((s, t) => s + t.rateUpload, 0);
  const fmt = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB/s` : b >= 1024 ? `${(b / 1024).toFixed(0)} KB/s` : `${b} B/s`;

  if (!config) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Transmission not configured.</Text>
        <Text style={styles.emptySubtext}>Add it in Settings to see your torrents.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Torrents</Text></View>
      <SpeedBanner downloadSpeed={fmt(totalDown)} uploadSpeed={fmt(totalUp)} thirdStat={{ value: String(torrents.length), label: 'Total' }} />
      <FilterChips chips={chips} activeId={filter} onSelect={(id) => setFilter(id as FilterId)} />
      <FlashList data={filtered} renderItem={({ item }) => <TorrentItem torrent={item} onPress={() => {}} />}
        keyExtractor={(item) => String(item.id)} estimatedItemSize={120}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchTorrents(); setRefreshing(false); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          loading
            ? <View style={styles.centered}><Text style={styles.emptyText}>Loading...</Text></View>
            : <View style={styles.centered}><Text style={styles.emptyText}>No torrents</Text></View>
        }
      />
      <FAB onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptySubtext: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
