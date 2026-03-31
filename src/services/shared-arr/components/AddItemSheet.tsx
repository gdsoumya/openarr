import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetWrapper } from '../../../core/components/BottomSheetWrapper';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getSonarrAdapter, getRadarrAdapter } from '../../../services/adapterFactory';
import { QualityProfile, RootFolder } from '../types';
import { tmdb } from '../../tmdb/instance';

interface AddItemSheetProps {
  visible: boolean;
  type: 'sonarr' | 'radarr';
  item: any;
  onDismiss: () => void;
  onAdded: (status: 'added' | 'added_searching') => void;
}

export function AddItemSheet({ visible, type, item, onDismiss, onAdded }: AddItemSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const { alert } = useThemedAlert();
  const config = useServiceConfig(type);
  const isLocal = useConnectionStore((s) => s.isLocal);

  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [folders, setFolders] = useState<RootFolder[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<number>(0);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Season monitoring — track which seasons are checked
  const [seasonMonitored, setSeasonMonitored] = useState<Map<number, boolean>>(new Map());

  // Get seasons from the item — handles both Sonarr (seasonNumber) and TMDB (season_number) formats
  const seasons: Array<{ seasonNumber: number }> = useMemo(() => {
    if (type !== 'sonarr') return [];
    const s = item?.seasons;
    if (Array.isArray(s) && s.length > 0) {
      // Normalize: Sonarr uses seasonNumber, TMDB uses season_number
      return s
        .map((season: any) => ({ seasonNumber: season.seasonNumber ?? season.season_number }))
        .filter((season) => season.seasonNumber > 0);
    }
    // Fallback to count
    const count = item?.number_of_seasons ?? item?.seasonCount;
    if (typeof count === 'number' && count > 0) {
      return Array.from({ length: count }, (_, i) => ({ seasonNumber: i + 1 }));
    }
    return [];
  }, [item, type]);

  // Initialize all seasons as monitored
  useEffect(() => {
    if (seasons.length > 0 && seasonMonitored.size === 0) {
      const map = new Map<number, boolean>();
      seasons.forEach(s => map.set(s.seasonNumber, true));
      setSeasonMonitored(map);
    }
  }, [seasons]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      loadOptions();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const loadOptions = async () => {
    if (!config) return;
    try {
      if (type === 'sonarr') {
        const adapter = getSonarrAdapter(config, isLocal);
        const [p, f] = await Promise.all([adapter.getQualityProfiles(), adapter.getRootFolders()]);
        setProfiles(p); setFolders(f);
        if (p.length > 0) setSelectedProfile(p[0].id);
        if (f.length > 0) setSelectedFolder(f[0].path);
      } else {
        const adapter = getRadarrAdapter(config, isLocal);
        const [p, f] = await Promise.all([adapter.getQualityProfiles(), adapter.getRootFolders()]);
        setProfiles(p); setFolders(f);
        if (p.length > 0) setSelectedProfile(p[0].id);
        if (f.length > 0) setSelectedFolder(f[0].path);
      }
    } catch (e) { console.error('Failed to load options:', e); }
  };

  const toggleSeason = (seasonNum: number) => {
    setSeasonMonitored(prev => {
      const next = new Map(prev);
      next.set(seasonNum, !next.get(seasonNum));
      return next;
    });
  };

  const selectAllSeasons = () => {
    const allChecked = seasons.every(s => seasonMonitored.get(s.seasonNumber));
    const map = new Map<number, boolean>();
    seasons.forEach(s => map.set(s.seasonNumber, !allChecked));
    setSeasonMonitored(map);
  };

  const monitoredSeasonCount = seasons.filter(s => seasonMonitored.get(s.seasonNumber)).length;

  const handleAdd = async (withSearch: boolean) => {
    if (!config || !selectedFolder || !selectedProfile) return;
    setLoading(true);
    try {
      if (type === 'sonarr') {
        const adapter = getSonarrAdapter(config, isLocal);

        // If this is a TMDB item (no tvdbId), resolve via TMDB external IDs → Sonarr lookup by tvdbId
        let seriesData = item;
        if (!item.tvdbId) {
          const tmdbId = item.id;
          // Step 1: Get TVDB ID from TMDB (exact, no fuzzy)
          const externalIds = await tmdb.getShowExternalIds(tmdbId);
          if (!externalIds.tvdb_id) {
            throw new Error('This show has no TVDB ID on TMDB. Cannot add to Sonarr.');
          }
          // Step 2: Lookup in Sonarr using tvdb:{id} for exact match
          const lookupResults = await adapter.lookupSeries(`tvdb:${externalIds.tvdb_id}`);
          const match = lookupResults.find((r: any) => r.tvdbId === externalIds.tvdb_id) ?? lookupResults[0];
          if (!match) throw new Error('Show not found in Sonarr lookup.');
          seriesData = match;
        }

        const allMonitored = seasons.length === 0 || seasons.every(s => seasonMonitored.get(s.seasonNumber));
        const noneMonitored = seasons.length > 0 && seasons.every(s => !seasonMonitored.get(s.seasonNumber));

        // Determine addOptions.monitor:
        // - 'all' if all seasons selected (or no season info)
        // - 'none' if no seasons selected
        // - For partial selection: use 'none' but set per-season monitored flags
        //   then after adding, the seasons array controls what's monitored
        const monitorPreset = noneMonitored ? 'none' : allMonitored ? 'all' : 'none';

        const body: any = {
          ...seriesData,
          qualityProfileId: selectedProfile,
          rootFolderPath: selectedFolder,
          seriesType: seriesData.seriesType ?? 'standard',
          monitored: true, // Series itself should always be monitored
          tags: [],
          addOptions: {
            monitor: monitorPreset,
            searchForMissingEpisodes: withSearch,
          },
        };

        // For partial season selection, override the seasons array
        if (seasons.length > 0) {
          body.seasons = seasons.map(s => ({
            seasonNumber: s.seasonNumber,
            monitored: seasonMonitored.get(s.seasonNumber) ?? true,
          }));
          // Also include season 0 (specials) as unmonitored
          if (!body.seasons.find((s: any) => s.seasonNumber === 0)) {
            body.seasons.unshift({ seasonNumber: 0, monitored: false });
          }
        }

        await adapter.addSeries(body);
      } else {
        const adapter = getRadarrAdapter(config, isLocal);

        // If this is a TMDB search item, lookup via Radarr using tmdb:{id} for exact match
        let movieData = item;
        if (!item.tmdbId || item.poster_path) {
          const tmdbId = item.tmdbId ?? item.id;
          const lookupResults = await adapter.lookupMovie(`tmdb:${tmdbId}`);
          const match = lookupResults.find((r: any) => r.tmdbId === tmdbId) ?? lookupResults[0];
          if (!match) throw new Error('Movie not found in Radarr lookup.');
          movieData = match;
        }

        const movieBody: any = {
          ...movieData,
          qualityProfileId: selectedProfile,
          rootFolderPath: selectedFolder,
          monitored: true,
          minimumAvailability: movieData.minimumAvailability ?? 'released',
          tags: [],
          addOptions: { searchForMovie: withSearch },
        };
        await adapter.addMovie(movieBody);
      }
      const itemTitle = item.title ?? item.name;
      onDismiss();
      onAdded(withSearch ? 'added_searching' : 'added');
      alert(
        withSearch ? 'Added & Searching' : 'Added Successfully',
        withSearch
          ? `"${itemTitle}" added to ${type === 'sonarr' ? 'Sonarr' : 'Radarr'} and search triggered. Check Activity for progress.`
          : `"${itemTitle}" added to ${type === 'sonarr' ? 'Sonarr' : 'Radarr'}. Status: Monitored (Missing).`,
      );
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.response?.data?.[0]?.errorMessage ?? e.message ?? 'Unknown error';
      alert('Failed to Add', msg);
    }
    setLoading(false);
  };

  return (
    <BottomSheetWrapper ref={sheetRef} snapPoints={['75%']} onClose={onDismiss}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Add to {type === 'sonarr' ? 'Sonarr' : 'Radarr'}</Text>

        <Text style={styles.label}>Quality Profile</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
          {profiles.map((p) => (
            <Pressable key={p.id} style={[styles.pickerItem, selectedProfile === p.id && styles.pickerItemActive]}
              onPress={() => setSelectedProfile(p.id)}>
              <Text style={[styles.pickerText, selectedProfile === p.id && styles.pickerTextActive]}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Root Folder</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
          {folders.map((f) => (
            <Pressable key={f.id} style={[styles.pickerItem, selectedFolder === f.path && styles.pickerItemActive]}
              onPress={() => setSelectedFolder(f.path)}>
              <Text style={[styles.pickerText, selectedFolder === f.path && styles.pickerTextActive]}>{f.path}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Per-season monitoring for TV */}
        {type === 'sonarr' && seasons.length > 0 && (
          <>
            <View style={styles.seasonHeader}>
              <Text style={styles.label}>Seasons to Monitor</Text>
              <Pressable onPress={selectAllSeasons}>
                <Text style={styles.selectAllText}>
                  {monitoredSeasonCount === seasons.length ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.seasonList}>
              {seasons.map((s) => {
                const checked = seasonMonitored.get(s.seasonNumber) ?? true;
                return (
                  <Pressable key={s.seasonNumber} style={styles.seasonRow} onPress={() => toggleSeason(s.seasonNumber)}>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Ionicons name="checkmark" size={14} color="#0f1023" />}
                    </View>
                    <Text style={[styles.seasonText, !checked && styles.seasonTextUnchecked]}>
                      Season {s.seasonNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.seasonSummary}>
              {monitoredSeasonCount} of {seasons.length} seasons selected
            </Text>
          </>
        )}

        {type === 'sonarr' && seasons.length === 0 && (
          <Text style={styles.noSeasons}>Season info not available — all seasons will be monitored</Text>
        )}

        <View style={styles.buttonRow}>
          <Pressable style={[styles.addBtn, loading && styles.addBtnDisabled]} onPress={() => handleAdd(false)} disabled={loading}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
          <Pressable style={[styles.addSearchBtn, loading && styles.addBtnDisabled]} onPress={() => handleAdd(true)} disabled={loading}>
            <Text style={styles.addSearchBtnText}>Add + Search</Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheetWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  label: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },
  pickerRow: { flexDirection: 'row', marginBottom: spacing.sm, height: 40 },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider, marginRight: spacing.sm },
  pickerItemActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  pickerText: { ...typography.caption, color: colors.textMuted },
  pickerTextActive: { color: colors.primary },

  // Season checkboxes
  seasonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  selectAllText: { ...typography.caption, color: colors.primary, fontWeight: '500' },
  seasonList: { marginTop: spacing.sm },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.divider, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  seasonText: { ...typography.body, color: colors.textPrimary },
  seasonTextUnchecked: { color: colors.textMuted },
  seasonSummary: { ...typography.micro, color: colors.textMuted, marginTop: spacing.sm },
  noSeasons: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.sm },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl, marginBottom: spacing.xl },
  addBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center' },
  addSearchBtn: { flex: 1, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { ...typography.bodyBold, color: '#0f1023' },
  addSearchBtnText: { ...typography.bodyBold, color: colors.primary },
});
