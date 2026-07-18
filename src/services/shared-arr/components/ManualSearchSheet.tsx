import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { Release } from '../types';
import { ReleaseSearchContext, ReleaseSearchStatus } from '../hooks';
import {
  defaultReleaseFilters, filterReleases, formatReleaseAge, formatSize,
  normalizeIndexerFlags, ReleaseFilters, ReleaseSortKey, sortReleases,
} from '../releaseUtils';
import { ReleaseRow } from './ReleaseRow';

interface ManualSearchSheetProps {
  visible: boolean;
  status: ReleaseSearchStatus;
  error?: string;
  releases: Release[];
  context?: ReleaseSearchContext;
  onGrab: (release: Release) => void;
  onRetry: () => void;
  onDismiss: () => void;
}

const PROTOCOL_LABELS = { all: 'All', torrent: 'Torrent', usenet: 'Usenet' } as const;
const TIER_CYCLE = ['all', '2160p', '1080p', '720p', 'sd'] as const;

export function ManualSearchSheet({ visible, status, error, releases, context, onGrab, onRetry, onDismiss }: ManualSearchSheetProps) {
  const { alert } = useThemedAlert();
  const insets = useSafeAreaInsets();
  // null = the arr's own decision-engine order (rejected still sinks last)
  const [sortBy, setSortBy] = useState<ReleaseSortKey | null>(null);
  const [filters, setFilters] = useState<ReleaseFilters>(defaultReleaseFilters);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSortBy(null);
      setFilters(defaultReleaseFilters);
      setExpandedKey(null);
    }
  }, [visible]);

  const rejectedCount = useMemo(() => releases.filter(r => r.rejected).length, [releases]);
  const hasSeasonPacks = context?.type === 'season' || releases.some(r => r.fullSeason);
  const hasCfScores = useMemo(() => releases.some(r => (r.customFormatScore ?? 0) !== 0), [releases]);

  const visibleReleases = useMemo(
    () => sortReleases(filterReleases(releases, filters), sortBy),
    [releases, sortBy, filters],
  );

  const confirmGrab = (item: Release) => {
    const info = [
      item.quality?.quality?.name,
      (item.customFormatScore ?? 0) !== 0 ? `CF ${item.customFormatScore! > 0 ? '+' : ''}${item.customFormatScore}` : null,
      formatSize(item.size),
      item.indexer,
      item.seeders !== undefined ? `${item.seeders} seeders` : null,
      formatReleaseAge(item),
      ...normalizeIndexerFlags(item.indexerFlags),
    ].filter(Boolean).join(' · ');

    alert(
      'Download Release',
      `${item.title}\n\n${info}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => onGrab(item) },
      ],
    );
  };

  const sortChips: Array<{ id: ReleaseSortKey; label: string }> = [
    ...(hasCfScores ? [{ id: 'cfScore' as const, label: 'CF Score' }] : []),
    { id: 'quality', label: 'Quality' },
    { id: 'seeders', label: 'Seeders' },
    { id: 'age', label: 'Newest' },
    { id: 'size', label: 'Largest' },
  ];

  const cycleProtocol = () => setFilters(f => ({
    ...f,
    protocol: f.protocol === 'all' ? 'torrent' : f.protocol === 'torrent' ? 'usenet' : 'all',
  }));
  const cycleTier = () => setFilters(f => ({
    ...f,
    qualityTier: TIER_CYCLE[(TIER_CYCLE.indexOf(f.qualityTier) + 1) % TIER_CYCLE.length],
  }));

  const subtitle = status === 'loading'
    ? 'Searching indexers...'
    : status === 'error'
      ? 'Search failed'
      : `${visibleReleases.length}${visibleReleases.length !== releases.length ? ` of ${releases.length}` : ''} releases${rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ''}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{context?.label ?? 'Manual Search'}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onDismiss}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>

        {status === 'success' && releases.length > 0 && (
          <View style={styles.chipsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chipRow}>
              <Text style={styles.chipLabel}>Sort:</Text>
              {sortChips.map((chip) => (
                <Pressable
                  key={chip.id}
                  style={[styles.chip, sortBy === chip.id && styles.chipActive]}
                  onPress={() => setSortBy(prev => prev === chip.id ? null : chip.id)}
                >
                  <Text style={[styles.chipText, sortBy === chip.id && styles.chipTextActive]}>{chip.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chipRow}>
              <Text style={styles.chipLabel}>Filter:</Text>
              <Pressable style={[styles.chip, filters.protocol !== 'all' && styles.chipActive]} onPress={cycleProtocol}>
                <Text style={[styles.chipText, filters.protocol !== 'all' && styles.chipTextActive]}>{PROTOCOL_LABELS[filters.protocol]}</Text>
              </Pressable>
              <Pressable style={[styles.chip, filters.qualityTier !== 'all' && styles.chipActive]} onPress={cycleTier}>
                <Text style={[styles.chipText, filters.qualityTier !== 'all' && styles.chipTextActive]}>
                  {filters.qualityTier === 'all' ? 'Any Quality' : filters.qualityTier.toUpperCase()}
                </Text>
              </Pressable>
              {rejectedCount > 0 && (
                <Pressable style={[styles.chip, filters.approvedOnly && styles.chipActive]} onPress={() => setFilters(f => ({ ...f, approvedOnly: !f.approvedOnly }))}>
                  <Text style={[styles.chipText, filters.approvedOnly && styles.chipTextActive]}>Approved Only</Text>
                </Pressable>
              )}
              {hasSeasonPacks && (
                <Pressable style={[styles.chip, filters.seasonPacksOnly && styles.chipActive]} onPress={() => setFilters(f => ({ ...f, seasonPacksOnly: !f.seasonPacksOnly }))}>
                  <Text style={[styles.chipText, filters.seasonPacksOnly && styles.chipTextActive]}>Season Packs</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        {status === 'loading' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Querying indexers, this may take a moment...</Text>
          </View>
        )}

        {status === 'error' && (
          <ErrorState message={error ?? 'Search failed'} onRetry={onRetry} />
        )}

        {status === 'success' && releases.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No releases found"
            message="No indexer returned results. Check indexer configuration in Sonarr/Radarr, or that Prowlarr is synced."
          />
        )}

        {status === 'success' && releases.length > 0 && visibleReleases.length === 0 && (
          <View style={styles.centerContainer}>
            <Text style={styles.noMatchText}>No releases match the active filters</Text>
            <Pressable style={styles.clearBtn} onPress={() => setFilters(defaultReleaseFilters)}>
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </Pressable>
          </View>
        )}

        {status === 'success' && visibleReleases.length > 0 && (
          <FlashList
            data={visibleReleases}
            extraData={expandedKey}
            keyExtractor={(item) => `${item.indexerId}:${item.guid}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const key = `${item.indexerId}:${item.guid}`;
              return (
                <ReleaseRow
                  release={item}
                  expanded={expandedKey === key}
                  onToggleExpand={() => setExpandedKey(prev => prev === key ? null : key)}
                  onGrab={() => confirmGrab(item)}
                />
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.md },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  closeBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  closeBtnText: { ...typography.bodyBold, color: colors.primary },
  chipsWrapper: { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: spacing.xs },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, height: 36 },
  chipLabel: { ...typography.micro, color: colors.textMuted, width: 34 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  chipText: { ...typography.micro, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  loadingText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
  noMatchText: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  clearBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: radii.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  clearBtnText: { ...typography.bodyBold, color: colors.primary },
  listContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, paddingBottom: 40 },
});
