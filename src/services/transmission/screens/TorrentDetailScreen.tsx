import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getTransmissionAdapter } from '../../../services/adapterFactory';
import { usePolling } from '../../../core/hooks/usePolling';
import { Torrent, TorrentStatus } from '../types';

function formatSpeed(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB/s`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB/s`;
  return `${bytes} B/s`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatEta(seconds: number): string {
  if (seconds < 0) return '∞';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function TorrentDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const initialTorrent: Torrent = route.params?.torrent;
  const [torrent, setTorrent] = useState<Torrent>(initialTorrent);

  const config = useServiceConfig('transmission');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getTransmissionAdapter(config, isLocal) : null, [config, isLocal]);

  const refresh = useCallback(async () => {
    if (!adapter) return;
    try {
      const torrents = await adapter.getTorrents();
      const updated = torrents.find(t => t.id === torrent.id);
      if (updated) setTorrent(updated);
    } catch {}
  }, [adapter, torrent.id]);

  usePolling(refresh, 3000, !!adapter);

  const isPaused = torrent.status === TorrentStatus.Stopped;

  const togglePause = async () => {
    if (!adapter) return;
    if (isPaused) await adapter.startTorrents([torrent.id]);
    else await adapter.stopTorrents([torrent.id]);
    refresh();
  };

  const confirmDelete = () => {
    Alert.alert('Delete Torrent', `Delete "${torrent.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTorrent(false) },
      { text: 'Delete + Files', style: 'destructive', onPress: () => deleteTorrent(true) },
    ]);
  };

  const deleteTorrent = async (deleteFiles: boolean) => {
    if (!adapter) return;
    await adapter.removeTorrents([torrent.id], deleteFiles);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></Pressable>
      </View>
      <Text style={styles.name}>{torrent.name}</Text>

      <ProgressBar progress={torrent.percentDone} height={6} style={styles.progressBar}
        variant={torrent.status === TorrentStatus.Seeding ? 'seed' : 'download'} />

      <View style={styles.statsGrid}>
        {[
          { label: 'Progress', value: `${(torrent.percentDone * 100).toFixed(1)}%` },
          { label: 'Download', value: formatSpeed(torrent.rateDownload) },
          { label: 'Upload', value: formatSpeed(torrent.rateUpload) },
          { label: 'ETA', value: torrent.eta > 0 ? formatEta(torrent.eta) : '—' },
          { label: 'Ratio', value: torrent.uploadRatio.toFixed(2) },
          { label: 'Peers', value: String(torrent.peersConnected) },
          { label: 'Size', value: formatSize(torrent.totalSize) },
          { label: 'Directory', value: torrent.downloadDir },
        ].map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, isPaused ? styles.actionResume : styles.actionPause]} onPress={togglePause}>
          <Text style={styles.actionText}>{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.actionDelete]} onPress={confirmDelete}>
          <Text style={[styles.actionText, { color: colors.error }]}>🗑 Delete</Text>
        </Pressable>
      </View>

      {torrent.files && torrent.files.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Files ({torrent.files.length})</Text>
          {torrent.files.map((file, idx) => {
            const stat = torrent.fileStats?.[idx];
            const progress = file.length > 0 ? file.bytesCompleted / file.length : 0;
            return (
              <View key={idx} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={2}>{file.name.split('/').pop()}</Text>
                  <Text style={styles.fileSize}>{formatSize(file.length)} · {(progress * 100).toFixed(0)}%</Text>
                </View>
                {stat && (
                  <Switch value={stat.wanted} onValueChange={async (wanted) => {
                    if (!adapter) return;
                    await adapter.setTorrent([torrent.id], { 'files-wanted': wanted ? [idx] : [], 'files-unwanted': wanted ? [] : [idx] });
                    refresh();
                  }} trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} thumbColor="#fff" />
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.sm },
  back: { ...typography.body, color: colors.primary },
  name: { ...typography.h3, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  progressBar: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xl },
  statItem: { width: '47%', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md },
  statLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { ...typography.bodyBold, color: colors.textPrimary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  actionBtn: { flex: 1, padding: spacing.md, borderRadius: radii.md, alignItems: 'center', borderWidth: 1 },
  actionResume: { borderColor: colors.primaryBorder, backgroundColor: colors.primaryMuted },
  actionPause: { borderColor: colors.divider, backgroundColor: colors.surfaceCard },
  actionDelete: { borderColor: 'rgba(233,69,96,0.3)', backgroundColor: 'rgba(233,69,96,0.08)' },
  actionText: { ...typography.bodyBold, color: colors.primary },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  fileItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  fileInfo: { flex: 1, marginRight: spacing.md },
  fileName: { ...typography.caption, color: colors.textPrimary, lineHeight: 17 },
  fileSize: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
});
