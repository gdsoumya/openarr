import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { Badge } from '../../../core/components/Badge';
import { Torrent, TorrentStatus } from '../types';
import { formatSpeed } from '../../../core/utils/format';

function formatEta(seconds: number): string {
  if (seconds < 0) return '∞';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function getStatusInfo(t: Torrent): { label: string; variant: 'downloading' | 'completed' | 'missing' | 'monitored' } {
  switch (t.status) {
    case TorrentStatus.Downloading: case TorrentStatus.QueuedToDownload:
      return { label: `↓ ${formatSpeed(t.rateDownload)}`, variant: 'downloading' };
    case TorrentStatus.Seeding: case TorrentStatus.QueuedToSeed:
      return { label: `↑ ${formatSpeed(t.rateUpload)}`, variant: 'completed' };
    case TorrentStatus.Stopped: return { label: 'Paused', variant: 'monitored' };
    default: return { label: 'Unknown', variant: 'monitored' };
  }
}

interface TorrentItemProps { torrent: Torrent; onPress: () => void; onLongPress?: () => void; selected?: boolean; }

export function TorrentItem({ torrent, onPress, onLongPress, selected }: TorrentItemProps) {
  const si = getStatusInfo(torrent);
  const isDl = torrent.status === TorrentStatus.Downloading;
  const isSeed = torrent.status === TorrentStatus.Seeding;
  return (
    <Pressable style={[styles.container, selected && styles.selected]} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={2}>{torrent.name}</Text>
        <Badge label={si.label} variant={si.variant} />
      </View>
      <ProgressBar progress={torrent.percentDone} variant={isSeed ? 'seed' : 'download'} style={styles.progress} />
      <View style={styles.stats}>
        <Text style={styles.stat}><Text style={styles.statVal}>{(torrent.percentDone * 100).toFixed(1)}%</Text></Text>
        {isDl && torrent.eta > 0 && <Text style={styles.stat}>ETA <Text style={styles.statVal}>{formatEta(torrent.eta)}</Text></Text>}
        {(isDl || isSeed) && <Text style={styles.stat}>↑ <Text style={styles.statVal}>{formatSpeed(torrent.rateUpload)}</Text></Text>}
        <Text style={styles.stat}>Ratio <Text style={styles.statVal}>{torrent.uploadRatio.toFixed(2)}</Text></Text>
        <Text style={styles.stat}>Peers <Text style={styles.statVal}>{torrent.peersConnected}</Text></Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.lg },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
  name: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, flex: 1, lineHeight: 17 },
  progress: { marginBottom: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  stat: { ...typography.micro, color: colors.textMuted },
  statVal: { color: colors.textSecondary, fontWeight: '500' },
});
