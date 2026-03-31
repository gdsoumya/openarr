import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { EpisodeItem } from './EpisodeItem';
import { Episode, Season } from '../types';

interface SeasonSectionProps { season: Season; episodes: Episode[]; onEpisodePress: (ep: Episode) => void; onSeasonMenu?: () => void; }

export function SeasonSection({ season, episodes, onEpisodePress, onSeasonMenu }: SeasonSectionProps) {
  const [expanded, setExpanded] = useState(season.seasonNumber === Math.max(...episodes.map(e => e.seasonNumber)));
  const seasonEps = episodes.filter(e => e.seasonNumber === season.seasonNumber);
  const fileCount = seasonEps.filter(e => e.hasFile).length;

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.title}>Season {season.seasonNumber}</Text>
        <Text style={styles.badge}>{fileCount} / {seasonEps.length} episodes</Text>
        {onSeasonMenu && (
          <Pressable onPress={onSeasonMenu} hitSlop={8} style={styles.menuBtn}>
            <Text style={styles.menuBtnText}>⋮</Text>
          </Pressable>
        )}
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>
      {expanded && seasonEps.map(ep => (
        <EpisodeItem key={ep.id} episode={ep} onPress={() => onEpisodePress(ep)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  title: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  badge: { ...typography.micro, color: colors.textMuted, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, marginRight: spacing.sm },
  chevron: { color: colors.textMuted, fontSize: 14 },
  menuBtn: { paddingHorizontal: spacing.sm },
  menuBtnText: { color: colors.textMuted, fontSize: 18, lineHeight: 20 },
});
