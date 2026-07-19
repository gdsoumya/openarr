import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, Platform, TextInput, Pressable, Modal, KeyboardAvoidingView } from 'react-native';
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
import { formatSpeed } from '../../../core/utils/format';

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

  usePolling(fetchTorrents, 5000, !!adapter);

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
    setAddInputText('');
    setShowAddInput(true);
  };

  const submitAdd = async () => {
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
        <DashboardButton />
        <Text style={styles.title}>Torrents</Text>
      </View>

      <SpeedBanner downloadSpeed={formatSpeed(totalDown)} uploadSpeed={formatSpeed(totalUp)} thirdStat={{ value: String(torrents.length), label: 'Total' }} />
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

      <Modal visible={showAddInput} transparent animationType="fade" onRequestClose={() => setShowAddInput(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Add Torrent</Text>
            <TextInput
              style={styles.dialogInput}
              value={addInputText}
              onChangeText={setAddInputText}
              placeholder="Paste magnet link or URL"
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={submitAdd}
              returnKeyType="done"
            />
            <View style={styles.dialogActions}>
              <Pressable style={styles.dialogCancel} onPress={() => setShowAddInput(false)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.dialogAdd, !addInputText.trim() && { opacity: 0.5 }]} onPress={submitAdd} disabled={!addInputText.trim()}>
                <Text style={styles.dialogAddText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dialogOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  dialogCard: { backgroundColor: colors.surfaceElevated, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.divider },
  dialogTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
  dialogInput: { ...typography.body, color: colors.textPrimary, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.md, padding: spacing.md },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  dialogCancel: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider },
  dialogCancelText: { ...typography.bodyBold, color: colors.textMuted },
  dialogAdd: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: radii.md, backgroundColor: colors.primary },
  dialogAddText: { ...typography.bodyBold, color: '#0f1023' },
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptySubtext: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
