import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { SubtitleBadge } from '../../bazarr/components/SubtitleBadge';
import { Episode } from '../types';

interface EpisodeItemProps { episode: Episode; subtitles?: { code2: string; has: boolean }[]; onPress: () => void; }

export function EpisodeItem({ episode, subtitles, onPress }: EpisodeItemProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={[styles.num, episode.hasFile ? styles.numDone : styles.numMissing]}>
        <Text style={styles.numText}>{episode.episodeNumber}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{episode.title}</Text>
        <Text style={styles.date}>{episode.airDateUtc ? new Date(episode.airDateUtc).toLocaleDateString() : 'TBA'}</Text>
        {subtitles && subtitles.length > 0 && (
          <View style={styles.subs}>{subtitles.map((s, i) => <SubtitleBadge key={i} code={s.code2} has={s.has} />)}</View>
        )}
      </View>
      <View style={[styles.statusIcon, episode.hasFile ? styles.statusDone : styles.statusMissing]}>
        <Text style={styles.statusText}>{episode.hasFile ? '✓' : '✕'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  num: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  numDone: { backgroundColor: 'rgba(100, 255, 218, 0.1)' },
  numMissing: { backgroundColor: 'rgba(255,255,255,0.04)' },
  numText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  info: { flex: 1 },
  title: { ...typography.caption, fontWeight: '500', color: colors.textPrimary },
  date: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  subs: { flexDirection: 'row', marginTop: 4 },
  statusIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusDone: { backgroundColor: 'rgba(100, 255, 218, 0.1)' },
  statusMissing: { backgroundColor: 'rgba(233, 69, 96, 0.1)' },
  statusText: { fontSize: 12 },
});
