import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, Alert, Platform, TextInput, Pressable } from 'react-native';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../../core/theme/tokens';
import { SpeedBanner } from '../../../core/components/SpeedBanner';
import { FilterChips } from '../../../core/components/FilterChips';
import { FAB } from '../../../core/components/FAB';
import { TorrentItem } from '../components/TorrentItem';
import { Torrent, TorrentStatus } from '../types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getTransmissionAdapter } from '../../../services/adapterFactory';
import { usePolling } from '../../../core/hooks/usePolling';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';
import { DashboardButton } from '../../../core/components/DashboardButton';

type FilterId = 'all' | 'downloading' | 'seeding' | 'paused';
const filterMap: Record<FilterId, (t: Torrent) => boolean> = {
  all: () => true,
  downloading: (t) => t.status === TorrentStatus.Downloading || t.status === TorrentStatus.QueuedToDownload,
  seeding: (t) => t.status === TorrentStatus.Seeding || t.status === TorrentStatus.QueuedToSeed,
  paused: (t) => t.status === TorrentStatus.Stopped,
};

export function TorrentListScreen() {
  const insets = useSafeAreaInsets();
  const config = useServiceConfig('transmission');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getTransmissionAdapter(config, isLocal) : null, [config, isLocal]);
  const navigation = useNavigation<any>();

  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [addInputText, setAddInputText] = useState('');
  const showToast = useToastStore((s) => s.show);
  const { alert } = useThemedAlert();

  const fetchTorrents = useCallback(async () => {
    if (!adapter) return;
    try {
      const data = await adapter.getTorrents();
      setTorrents(data);
      setLoading(false);
    } catch (e: any) {
      showToast(e.message ?? 'Failed to fetch torrents', 'error');
      setLoading(false);
    }
  }, [adapter]);

  usePolling(fetchTorrents, 3000, !!adapter);

  const handleAddTorrent = async (url: string) => {
    if (!url.trim() || !adapter) return;
    try {
      await adapter.addTorrent({ filename: url.trim() });
      fetchTorrents();
    } catch (e: any) {
      alert('Error', e.message);
    }
  };

  const handleFabPress = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Add Torrent', 'Paste magnet link or URL', async (text) => {
        if (text) await handleAddTorrent(text);
      });
    } else {
      setShowAddInput(true);
      setAddInputText('');
    }
  };

  const submitAndroidAdd = async () => {
    setShowAddInput(false);
    await handleAddTorrent(addInputText);
    setAddInputText('');
  };

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

  if (loading && torrents.length === 0) return <LoadingSpinner message="Loading torrents..." />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Torrents</Text>
        <DashboardButton />
      </View>

      {showAddInput && (
        <View style={styles.addInputRow}>
          <TextInput
            style={styles.addInput}
            value={addInputText}
            onChangeText={setAddInputText}
            placeholder="Paste magnet link or URL"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={submitAndroidAdd}
            returnKeyType="done"
          />
          <Pressable style={styles.addInputBtn} onPress={submitAndroidAdd}>
            <Text style={styles.addInputBtnText}>Add</Text>
          </Pressable>
          <Pressable style={styles.addInputCancel} onPress={() => setShowAddInput(false)}>
            <Text style={styles.addInputCancelText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <SpeedBanner downloadSpeed={fmt(totalDown)} uploadSpeed={fmt(totalUp)} thirdStat={{ value: String(torrents.length), label: 'Total' }} />
      <FilterChips chips={chips} activeId={filter} onSelect={(id) => setFilter(id as FilterId)} />
      <FlashList
        data={filtered}
        renderItem={({ item }) => (
          <TorrentItem
            torrent={item}
            onPress={() => navigation.navigate('TorrentDetail', { torrent: item })}
          />
        )}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await fetchTorrents(); setRefreshing(false); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          loading
            ? <View style={styles.centered}><Text style={styles.emptyText}>Loading...</Text></View>
            : <View style={styles.centered}><Text style={styles.emptyText}>No torrents</Text></View>
        }
      />
      <FAB onPress={handleFabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h1, color: colors.textPrimary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptySubtext: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  addInputBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addInputBtnText: { ...typography.bodyBold, color: '#0f1023' },
  addInputCancel: { paddingHorizontal: spacing.sm },
  addInputCancelText: { ...typography.body, color: colors.textMuted },
});
