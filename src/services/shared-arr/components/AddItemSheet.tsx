import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetWrapper } from '../../../core/components/BottomSheetWrapper';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getSonarrAdapter, getRadarrAdapter } from '../../../services/adapterFactory';
import { QualityProfile, RootFolder } from '../types';

interface AddItemSheetProps {
  visible: boolean;
  type: 'sonarr' | 'radarr';
  item: any;
  onDismiss: () => void;
  onAdded: () => void;
}

export function AddItemSheet({ visible, type, item, onDismiss, onAdded }: AddItemSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const config = useServiceConfig(type);
  const isLocal = useConnectionStore((s) => s.isLocal);

  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [folders, setFolders] = useState<RootFolder[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<number>(0);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [monitored] = useState(true);
  const [loading, setLoading] = useState(false);
  const [monitorPreset, setMonitorPreset] = useState('all');

  const monitorPresets = [
    { id: 'all', label: 'All Seasons' },
    { id: 'future', label: 'Future Only' },
    { id: 'latestSeason', label: 'Latest Season' },
    { id: 'firstSeason', label: 'First Season' },
    { id: 'none', label: 'None' },
  ];

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
        setProfiles(p);
        setFolders(f);
        if (p.length > 0) setSelectedProfile(p[0].id);
        if (f.length > 0) setSelectedFolder(f[0].path);
      } else {
        const adapter = getRadarrAdapter(config, isLocal);
        const [p, f] = await Promise.all([adapter.getQualityProfiles(), adapter.getRootFolders()]);
        setProfiles(p);
        setFolders(f);
        if (p.length > 0) setSelectedProfile(p[0].id);
        if (f.length > 0) setSelectedFolder(f[0].path);
      }
    } catch (e) {
      console.error('Failed to load options:', e);
    }
  };

  const handleAdd = async (withSearch: boolean) => {
    if (!config || !selectedFolder || !selectedProfile) return;
    setLoading(true);
    try {
      if (type === 'sonarr') {
        const adapter = getSonarrAdapter(config, isLocal);
        await adapter.addSeries({
          tvdbId: item.tvdbId ?? item.id,
          title: item.title ?? item.name,
          qualityProfileId: selectedProfile,
          rootFolderPath: selectedFolder,
          seriesType: 'standard',
          monitored,
          tags: [],
          addOptions: { monitor: monitorPreset, searchForMissingEpisodes: withSearch },
        });
      } else {
        const adapter = getRadarrAdapter(config, isLocal);
        await adapter.addMovie({
          tmdbId: item.tmdbId ?? item.id,
          title: item.title,
          qualityProfileId: selectedProfile,
          rootFolderPath: selectedFolder,
          monitored,
          minimumAvailability: 'released',
          tags: [],
          addOptions: { searchForMovie: withSearch },
        });
      }
      onAdded();
      onDismiss();
    } catch (e: any) {
      console.error('Add failed:', e);
    }
    setLoading(false);
  };

  return (
    <BottomSheetWrapper ref={sheetRef} snapPoints={['60%']} onClose={onDismiss}>
      <Text style={styles.title}>Add to {type === 'sonarr' ? 'Sonarr' : 'Radarr'}</Text>

      <Text style={styles.label}>Quality Profile</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
        {profiles.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.pickerItem, selectedProfile === p.id && styles.pickerItemActive]}
            onPress={() => setSelectedProfile(p.id)}
          >
            <Text style={[styles.pickerText, selectedProfile === p.id && styles.pickerTextActive]}>{p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Root Folder</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
        {folders.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.pickerItem, selectedFolder === f.path && styles.pickerItemActive]}
            onPress={() => setSelectedFolder(f.path)}
          >
            <Text style={[styles.pickerText, selectedFolder === f.path && styles.pickerTextActive]}>{f.path}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {type === 'sonarr' && (
        <>
          <Text style={styles.label}>Monitor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            {monitorPresets.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.pickerItem, monitorPreset === p.id && styles.pickerItemActive]}
                onPress={() => setMonitorPreset(p.id)}
              >
                <Text style={[styles.pickerText, monitorPreset === p.id && styles.pickerTextActive]}>{p.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.addBtn, loading && styles.addBtnDisabled]}
          onPress={() => handleAdd(false)}
          disabled={loading}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
        <Pressable
          style={[styles.addSearchBtn, loading && styles.addBtnDisabled]}
          onPress={() => handleAdd(true)}
          disabled={loading}
        >
          <Text style={styles.addSearchBtnText}>Add + Search</Text>
        </Pressable>
      </View>
    </BottomSheetWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  label: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },
  pickerRow: { flexDirection: 'row', marginBottom: spacing.sm },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.round,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.divider,
    marginRight: spacing.sm,
  },
  pickerItemActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  pickerText: { ...typography.caption, color: colors.textMuted },
  pickerTextActive: { color: colors.primary },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxl },
  addBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  addSearchBtn: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { ...typography.bodyBold, color: '#0f1023' },
  addSearchBtnText: { ...typography.bodyBold, color: colors.primary },
});
