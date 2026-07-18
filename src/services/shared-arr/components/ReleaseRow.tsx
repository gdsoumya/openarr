import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { Release } from '../types';
import {
  cfScoreTone, formatReleaseAge, formatSize, normalizeIndexerFlags,
  peerHealthColor, qualityTier, qualityTierColor,
} from '../releaseUtils';

interface ReleaseRowProps {
  release: Release;
  expanded: boolean;
  onToggleExpand: () => void;
  onGrab: () => void;
}

const CF_TONE_COLOR = { positive: colors.success, neutral: colors.textMuted, negative: colors.error } as const;

export const ReleaseRow = React.memo(function ReleaseRow({ release, expanded, onToggleExpand, onGrab }: ReleaseRowProps) {
  const r = release;
  const flags = normalizeIndexerFlags(r.indexerFlags);
  const isRepack = (r.quality?.revision?.version ?? 1) > 1 || r.quality?.revision?.isRepack;
  const languages = (r.languages ?? []).filter((l) => l.name !== 'English');
  const cfScore = r.customFormatScore ?? 0;
  const hasDetails = (r.rejections?.length ?? 0) > 0 || (r.customFormats?.length ?? 0) > 0;

  return (
    <Pressable style={[styles.item, r.rejected && styles.itemRejected]} onPress={onGrab}>
      <View style={styles.itemHeader}>
        <MaterialCommunityIcons
          name={r.rejected ? 'close-circle' : 'check-circle'}
          size={15}
          color={r.rejected ? colors.error : colors.success}
          style={styles.stateIcon}
        />
        <Text style={[styles.itemTitle, r.rejected && styles.itemTitleRejected]} numberOfLines={2}>{r.title}</Text>
        {hasDetails && (
          <Pressable hitSlop={8} onPress={onToggleExpand}>
            <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { borderColor: qualityTierColor(qualityTier(r)) }]}>
          <Text style={[styles.badgeText, { color: qualityTierColor(qualityTier(r)) }]}>{r.quality?.quality?.name ?? '?'}</Text>
        </View>
        {isRepack && <View style={[styles.badge, { borderColor: colors.warning }]}><Text style={[styles.badgeText, { color: colors.warning }]}>REPACK</Text></View>}
        {cfScore !== 0 && (
          <View style={[styles.badge, { borderColor: CF_TONE_COLOR[cfScoreTone(cfScore)] }]}>
            <Text style={[styles.badgeText, { color: CF_TONE_COLOR[cfScoreTone(cfScore)] }]}>CF {cfScore > 0 ? `+${cfScore}` : cfScore}</Text>
          </View>
        )}
        {r.fullSeason && <View style={[styles.badge, { borderColor: colors.sonarr }]}><Text style={[styles.badgeText, { color: colors.sonarr }]}>SEASON PACK</Text></View>}
        {languages.map((l) => (
          <View key={l.id} style={styles.badge}><Text style={styles.badgeText}>{l.name}</Text></View>
        ))}
        {flags.map((f) => (
          <View key={f} style={[styles.badge, { borderColor: colors.warning }]}><Text style={[styles.badgeText, { color: colors.warning }]}>{f}</Text></View>
        ))}
        <View style={styles.badge}><Text style={[styles.badgeText, { color: colors.info }]}>{r.protocol}</Text></View>
      </View>

      <View style={styles.itemStats}>
        <Text style={styles.stat}>{formatSize(r.size)}</Text>
        <Text style={styles.stat}>{formatReleaseAge(r)}</Text>
        <Text style={styles.stat} numberOfLines={1}>{r.indexer}</Text>
        {r.protocol === 'torrent' && r.seeders !== undefined && (
          <Text style={[styles.stat, { color: peerHealthColor(r.seeders) }]}>S:{r.seeders}</Text>
        )}
        {r.protocol === 'torrent' && r.leechers !== undefined && <Text style={styles.stat}>L:{r.leechers}</Text>}
      </View>

      {expanded && (
        <View style={styles.expanded}>
          {(r.rejections ?? []).map((reason, i) => (
            <Text key={i} style={styles.rejectionText}>• {reason}</Text>
          ))}
          {(r.customFormats?.length ?? 0) > 0 && (
            <Text style={styles.cfText}>Formats: {r.customFormats!.map((f) => f.name).join(', ')}</Text>
          )}
        </View>
      )}
      {!expanded && r.rejected && (r.rejections?.length ?? 0) > 0 && (
        <Text style={styles.rejectionText} numberOfLines={1}>
          {r.rejections![0]}{r.rejections!.length > 1 ? `  (+${r.rejections!.length - 1} more)` : ''}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  item: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  itemRejected: { opacity: 0.55, borderColor: 'rgba(233,69,96,0.15)' },
  itemHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  stateIcon: { marginTop: 1 },
  itemTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, flex: 1, lineHeight: 17 },
  itemTitleRejected: { color: colors.textMuted },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.divider },
  badgeText: { ...typography.badge, color: colors.textMuted },
  itemStats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  stat: { ...typography.micro, color: colors.textMuted, maxWidth: 140 },
  expanded: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  rejectionText: { ...typography.micro, color: colors.error, marginTop: 4, fontStyle: 'italic' },
  cfText: { ...typography.micro, color: colors.textSecondary, marginTop: 4 },
});
