import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { SubtitleBadge } from '../../bazarr/components/SubtitleBadge';
import { Episode } from '../types';

interface EpisodeItemProps {
  episode: Episode;
  subtitles?: { code2: string; has: boolean }[];
  downloadProgress?: number; // 0-100, undefined if not downloading
  onPress: () => void;
}

export function EpisodeItem({ episode, subtitles, downloadProgress, onPress }: EpisodeItemProps) {
  const isDownloading = downloadProgress !== undefined && downloadProgress < 100;
  const isAired = episode.airDateUtc ? new Date(episode.airDateUtc) < new Date() : false;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {/* Episode number */}
      <View style={[
        styles.num,
        episode.hasFile ? styles.numDone : isDownloading ? styles.numDownloading : isAired ? styles.numMissing : styles.numUnaired,
      ]}>
        <Text style={[styles.numText, episode.hasFile && styles.numTextDone]}>{episode.episodeNumber}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{episode.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.date}>{episode.airDateUtc ? new Date(episode.airDateUtc).toLocaleDateString() : 'TBA'}</Text>
          {episode.hasFile && episode.episodeFile && (
            <Text style={styles.quality}>{episode.episodeFile.quality?.quality?.name}</Text>
          )}
        </View>
        {isDownloading && (
          <View style={styles.progressRow}>
            <ProgressBar progress={downloadProgress / 100} height={3} style={styles.progressBar} />
            <Text style={styles.progressText}>{Math.round(downloadProgress)}%</Text>
          </View>
        )}
        {subtitles && subtitles.length > 0 && (
          <View style={styles.subs}>{subtitles.map((s, i) => <SubtitleBadge key={i} code={s.code2} has={s.has} />)}</View>
        )}
      </View>

      {/* Status icon — more prominent */}
      {isDownloading ? (
        <View style={styles.statusDownloading}>
          <Text style={styles.statusDownloadingText}>↓</Text>
        </View>
      ) : (
        <View style={[
          styles.statusIcon,
          episode.hasFile ? styles.statusDone : isAired ? styles.statusMissing : styles.statusUnaired,
        ]}>
          <Text style={[
            styles.statusText,
            episode.hasFile ? styles.statusTextDone : isAired ? styles.statusTextMissing : styles.statusTextUnaired,
          ]}>
            {episode.hasFile ? '✓' : isAired ? '✕' : '—'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },

  // Episode number badge
  num: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  numDone: { backgroundColor: 'rgba(100, 255, 218, 0.2)' },
  numDownloading: { backgroundColor: 'rgba(100, 255, 218, 0.15)' },
  numMissing: { backgroundColor: 'rgba(233, 69, 96, 0.15)' },
  numUnaired: { backgroundColor: 'rgba(255,255,255,0.04)' },
  numText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  numTextDone: { color: colors.primary },

  // Info
  info: { flex: 1 },
  title: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  date: { ...typography.micro, color: colors.textMuted },
  quality: { ...typography.micro, color: colors.primary, fontWeight: '500' },
  subs: { flexDirection: 'row', marginTop: 4 },

  // Download progress
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  progressBar: { flex: 1 },
  progressText: { ...typography.micro, color: colors.primary, fontWeight: '600', width: 32, textAlign: 'right' },

  // Status icons — MORE PROMINENT
  statusIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusDone: { backgroundColor: 'rgba(100, 255, 218, 0.25)', borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.3)' },
  statusMissing: { backgroundColor: 'rgba(233, 69, 96, 0.2)', borderWidth: 1, borderColor: 'rgba(233, 69, 96, 0.3)' },
  statusUnaired: { backgroundColor: 'rgba(255,255,255,0.04)' },
  statusText: { fontSize: 14, fontWeight: '700' },
  statusTextDone: { color: colors.success },
  statusTextMissing: { color: colors.error },
  statusTextUnaired: { color: colors.textMuted },

  // Downloading status
  statusDownloading: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(100, 255, 218, 0.2)', borderWidth: 1, borderColor: colors.primaryBorder },
  statusDownloadingText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
