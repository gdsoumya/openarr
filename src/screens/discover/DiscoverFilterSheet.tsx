import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../../core/theme/tokens';
import { tmdb } from '../../services/tmdb/instance';
import { useSettingsStore } from '../../stores/settingsStore';
import { DiscoverFilters, TMDBGenre, WatchProvider } from '../../services/tmdb/types';

interface DiscoverFilterSheetProps {
  visible: boolean;
  mediaType: 'movie' | 'tv';
  filters: DiscoverFilters;
  onApply: (filters: DiscoverFilters) => void;
  onDismiss: () => void;
}

const SORT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'popularity.desc', label: 'Popular' },
  { id: 'vote_average.desc', label: 'TMDB Rating' },
  { id: 'client:imdb', label: 'IMDB Rating' },
  { id: 'client:rt', label: 'RT Score' },
  { id: 'primary_release_date.desc', label: 'Newest' },
  { id: 'primary_release_date.asc', label: 'Oldest' },
  { id: 'revenue.desc', label: 'Box Office' },
];

const TV_SORT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'popularity.desc', label: 'Popular' },
  { id: 'vote_average.desc', label: 'TMDB Rating' },
  { id: 'client:imdb', label: 'IMDB Rating' },
  { id: 'client:rt', label: 'RT Score' },
  { id: 'first_air_date.desc', label: 'Newest' },
  { id: 'first_air_date.asc', label: 'Oldest' },
];

const LANGUAGES: Array<{ id: string; label: string }> = [
  { id: 'en', label: 'English' }, { id: 'hi', label: 'Hindi' }, { id: 'ja', label: 'Japanese' },
  { id: 'ko', label: 'Korean' }, { id: 'es', label: 'Spanish' }, { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' }, { id: 'ta', label: 'Tamil' }, { id: 'te', label: 'Telugu' },
  { id: 'it', label: 'Italian' }, { id: 'zh', label: 'Chinese' },
];

const COUNTRIES: Array<{ id: string; label: string }> = [
  { id: 'US', label: 'USA' }, { id: 'IN', label: 'India' }, { id: 'GB', label: 'UK' },
  { id: 'JP', label: 'Japan' }, { id: 'KR', label: 'Korea' }, { id: 'FR', label: 'France' },
  { id: 'DE', label: 'Germany' }, { id: 'ES', label: 'Spain' }, { id: 'CA', label: 'Canada' },
];

const TV_NETWORKS: Array<{ id: number; label: string }> = [
  { id: 213, label: 'Netflix' }, { id: 49, label: 'HBO' }, { id: 2739, label: 'Disney+' },
  { id: 1024, label: 'Prime Video' }, { id: 2552, label: 'Apple TV+' }, { id: 453, label: 'Hulu' },
  { id: 4, label: 'BBC One' }, { id: 174, label: 'AMC' }, { id: 88, label: 'FX' },
];

export function DiscoverFilterSheet({ visible, mediaType, filters, onApply, onDismiss }: DiscoverFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const region = useSettingsStore((s) => s.region);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [draft, setDraft] = useState<DiscoverFilters>(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      tmdb.getGenres(mediaType).then(setGenres).catch(() => {});
      tmdb.getWatchProviderList(mediaType, region).then((p) => setProviders(p.slice(0, 20))).catch(() => {});
    }
  }, [visible, mediaType]);

  const toggleGenre = (id: number) => setDraft((d) => ({
    ...d,
    genreIds: d.genreIds?.includes(id) ? d.genreIds.filter((g) => g !== id) : [...(d.genreIds ?? []), id],
  }));

  const toggleNetwork = (id: number) => setDraft((d) => ({
    ...d,
    networkIds: d.networkIds?.includes(id) ? d.networkIds.filter((n) => n !== id) : [...(d.networkIds ?? []), id],
  }));

  const toggleProvider = (id: number) => setDraft((d) => ({
    ...d,
    watchProviderIds: d.watchProviderIds?.includes(id) ? d.watchProviderIds.filter((p) => p !== id) : [...(d.watchProviderIds ?? []), id],
    region,
  }));

  const sortOptions = mediaType === 'movie' ? SORT_OPTIONS : TV_SORT_OPTIONS;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={onDismiss}><Text style={styles.closeText}>Cancel</Text></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={styles.sectionTitle}>Sort By</Text>
          <View style={styles.chipWrap}>
            {sortOptions.map((opt) => {
              const active = (draft.sortBy ?? 'popularity.desc') === opt.id;
              return (
                <Pressable key={opt.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setDraft((d) => ({ ...d, sortBy: opt.id }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Genres</Text>
          <View style={styles.chipWrap}>
            {genres.map((g) => {
              const active = draft.genreIds?.includes(g.id);
              return (
                <Pressable key={g.id} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleGenre(g.id)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Language</Text>
          <View style={styles.chipWrap}>
            {LANGUAGES.map((l) => {
              const active = draft.originalLanguage === l.id;
              return (
                <Pressable key={l.id} style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDraft((d) => ({ ...d, originalLanguage: active ? undefined : l.id }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Country of Origin</Text>
          <View style={styles.chipWrap}>
            {COUNTRIES.map((c) => {
              const active = draft.originCountry === c.id;
              return (
                <Pressable key={c.id} style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDraft((d) => ({ ...d, originCountry: active ? undefined : c.id }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {mediaType === 'tv' && (
            <>
              <Text style={styles.sectionTitle}>Network</Text>
              <View style={styles.chipWrap}>
                {TV_NETWORKS.map((n) => {
                  const active = draft.networkIds?.includes(n.id);
                  return (
                    <Pressable key={n.id} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleNetwork(n.id)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{n.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Year Range</Text>
          <View style={styles.yearRow}>
            <TextInput
              style={styles.yearInput}
              placeholder="From"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={draft.yearFrom ? String(draft.yearFrom) : ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, yearFrom: t ? parseInt(t, 10) || undefined : undefined }))}
            />
            <Text style={styles.yearDash}>—</Text>
            <TextInput
              style={styles.yearInput}
              placeholder="To"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={draft.yearTo ? String(draft.yearTo) : ''}
              onChangeText={(t) => setDraft((d) => ({ ...d, yearTo: t ? parseInt(t, 10) || undefined : undefined }))}
            />
          </View>

          <Text style={styles.sectionTitle}>Minimum Rating</Text>
          <View style={styles.chipWrap}>
            {[0, 5, 6, 7, 8].map((r) => {
              const active = (draft.minRating ?? 0) === r;
              return (
                <Pressable key={r} style={[styles.chip, active && styles.chipActive]} onPress={() => setDraft((d) => ({ ...d, minRating: r || undefined }))}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{r === 0 ? 'Any' : `${r}+`}</Text>
                </Pressable>
              );
            })}
          </View>

          {providers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Streaming On ({region})</Text>
              <View style={styles.chipWrap}>
                {providers.map((p) => {
                  const active = draft.watchProviderIds?.includes(p.provider_id);
                  return (
                    <Pressable key={p.provider_id} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleProvider(p.provider_id)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.provider_name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.resetBtn} onPress={() => setDraft({ sortBy: 'popularity.desc' })}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={() => onApply(draft)}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { ...typography.h3, color: colors.textPrimary },
  closeText: { ...typography.bodyBold, color: colors.textMuted },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xl },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  chipText: { ...typography.caption, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  yearInput: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md, width: 100, textAlign: 'center' },
  yearDash: { ...typography.body, color: colors.textMuted },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  resetBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center' },
  resetBtnText: { ...typography.bodyBold, color: colors.textMuted },
  applyBtn: { flex: 2, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center' },
  applyBtnText: { ...typography.bodyBold, color: '#0f1023' },
});
