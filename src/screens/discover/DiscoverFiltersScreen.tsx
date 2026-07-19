import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../core/theme/tokens';
import { tmdb } from '../../services/tmdb/instance';
import { useSettingsStore } from '../../stores/settingsStore';
import { DiscoverFilters, TMDBGenre, WatchProvider } from '../../services/tmdb/types';

// Pushed as a normal stack screen (not a modal) so the bottom tab bar stays visible
interface RouteParams {
  mediaType: 'movie' | 'tv';
  filters: DiscoverFilters;
  onApply: (filters: DiscoverFilters) => void;
}

const SORT_OPTIONS: Array<{ id: string; label: string; movieOnly?: boolean }> = [
  { id: 'popularity.desc', label: 'Popular' },
  { id: 'vote_average.desc', label: 'TMDB Rating' },
  { id: 'client:imdb', label: 'IMDB Rating' },
  { id: 'client:rt', label: 'RT Score' },
  { id: 'date.desc', label: 'Newest' },
  { id: 'date.asc', label: 'Oldest' },
  { id: 'revenue.desc', label: 'Box Office', movieOnly: true },
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

// Recent years first, back to 1950
const YEARS = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i);

const RUNTIMES: Array<{ id: string; label: string; from?: number; to?: number }> = [
  { id: 'any', label: 'Any' },
  { id: 'short', label: '< 90 min', to: 90 },
  { id: 'medium', label: '90–150 min', from: 90, to: 150 },
  { id: 'long', label: '> 150 min', from: 150 },
];

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function DiscoverFiltersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mediaType, filters, onApply } = route.params as RouteParams;
  const region = useSettingsStore((s) => s.region);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [draft, setDraft] = useState<DiscoverFilters>(filters);
  const [yearPicker, setYearPicker] = useState<'from' | 'to' | null>(null);

  const pickYear = (year?: number) => {
    setDraft((d) => yearPicker === 'from'
      ? { ...d, yearFrom: year, yearTo: year && d.yearTo && d.yearTo < year ? undefined : d.yearTo }
      : { ...d, yearTo: year, yearFrom: year && d.yearFrom && d.yearFrom > year ? undefined : d.yearFrom });
    setYearPicker(null);
  };

  useEffect(() => {
    tmdb.getGenres(mediaType).then(setGenres).catch(() => {});
    tmdb.getWatchProviderList(mediaType, region).then((p) => setProviders(p.slice(0, 20))).catch(() => {});
  }, [mediaType, region]);

  const toggleIn = (key: 'genreIds' | 'networkIds' | 'watchProviderIds', id: number) => setDraft((d) => {
    const current = (d[key] as number[] | undefined) ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    return { ...d, [key]: next, ...(key === 'watchProviderIds' ? { region } : {}) };
  });

  // Map the generic date sort ids to the media-specific TMDB fields
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
  const currentSort = (draft.sortBy ?? 'popularity.desc')
    .replace(`${dateField}.desc`, 'date.desc')
    .replace(`${dateField}.asc`, 'date.asc');

  const setSort = (id: string) => {
    const resolved = id.startsWith('date.') ? id.replace('date', dateField) : id;
    setDraft((d) => ({ ...d, sortBy: resolved }));
  };

  const runtimeId = RUNTIMES.find((r) => r.from === draft.runtimeFrom && r.to === draft.runtimeTo)?.id ?? 'any';

  const apply = () => {
    onApply(draft);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Text style={styles.sectionTitle}>Sort By</Text>
        <View style={styles.chipWrap}>
          {SORT_OPTIONS.filter((o) => !o.movieOnly || mediaType === 'movie').map((opt) => (
            <Chip key={opt.id} label={opt.label} active={currentSort === opt.id} onPress={() => setSort(opt.id)} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Genres</Text>
        <View style={styles.chipWrap}>
          {genres.map((g) => (
            <Chip key={g.id} label={g.name} active={draft.genreIds?.includes(g.id)} onPress={() => toggleIn('genreIds', g.id)} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.chipWrap}>
          {LANGUAGES.map((l) => (
            <Chip key={l.id} label={l.label} active={draft.originalLanguage === l.id}
              onPress={() => setDraft((d) => ({ ...d, originalLanguage: d.originalLanguage === l.id ? undefined : l.id }))} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Country of Origin</Text>
        <View style={styles.chipWrap}>
          {COUNTRIES.map((c) => (
            <Chip key={c.id} label={c.label} active={draft.originCountry === c.id}
              onPress={() => setDraft((d) => ({ ...d, originCountry: d.originCountry === c.id ? undefined : c.id }))} />
          ))}
        </View>

        {mediaType === 'tv' && (
          <>
            <Text style={styles.sectionTitle}>Network</Text>
            <View style={styles.chipWrap}>
              {TV_NETWORKS.map((n) => (
                <Chip key={n.id} label={n.label} active={draft.networkIds?.includes(n.id)} onPress={() => toggleIn('networkIds', n.id)} />
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>{mediaType === 'movie' ? 'Release Year' : 'First Aired'}</Text>
        <View style={styles.yearRow}>
          <Pressable style={styles.yearField} onPress={() => setYearPicker('from')}>
            <Text style={styles.yearFieldLabel}>From</Text>
            <Text style={[styles.yearFieldValue, draft.yearFrom ? { color: colors.primary } : null]}>
              {draft.yearFrom ?? 'Any'}
            </Text>
          </Pressable>
          <Text style={styles.yearDash}>—</Text>
          <Pressable style={styles.yearField} onPress={() => setYearPicker('to')}>
            <Text style={styles.yearFieldLabel}>To</Text>
            <Text style={[styles.yearFieldValue, draft.yearTo ? { color: colors.primary } : null]}>
              {draft.yearTo ?? 'Any'}
            </Text>
          </Pressable>
        </View>

        {mediaType === 'movie' && (
          <>
            <Text style={styles.sectionTitle}>Runtime</Text>
            <View style={styles.chipWrap}>
              {RUNTIMES.map((r) => (
                <Chip key={r.id} label={r.label} active={runtimeId === r.id}
                  onPress={() => setDraft((d) => ({ ...d, runtimeFrom: r.from, runtimeTo: r.to }))} />
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>TMDB User Score (minimum)</Text>
        <View style={styles.chipWrap}>
          {[0, 5, 6, 7, 8].map((r) => (
            <Chip key={r} label={r === 0 ? 'Any' : `${r}+`} active={(draft.minRating ?? 0) === r}
              onPress={() => setDraft((d) => ({ ...d, minRating: r || undefined }))} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>IMDB Rating (minimum)</Text>
        <Text style={styles.sectionHint}>Applied to loaded results as ratings resolve</Text>
        <View style={styles.chipWrap}>
          {[0, 6, 7, 8].map((r) => (
            <Chip key={r} label={r === 0 ? 'Any' : `${r}+`} active={(draft.minImdb ?? 0) === r}
              onPress={() => setDraft((d) => ({ ...d, minImdb: r || undefined }))} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>RT Critic Score (minimum)</Text>
        <Text style={styles.sectionHint}>Applied to loaded results as ratings resolve</Text>
        <View style={styles.chipWrap}>
          {[0, 60, 75, 90].map((r) => (
            <Chip key={r} label={r === 0 ? 'Any' : `${r}%+`} active={(draft.minRt ?? 0) === r}
              onPress={() => setDraft((d) => ({ ...d, minRt: r || undefined }))} />
          ))}
        </View>

        {providers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Streaming On ({region})</Text>
            <View style={styles.chipWrap}>
              {providers.map((p) => (
                <Chip key={p.provider_id} label={p.provider_name} active={draft.watchProviderIds?.includes(p.provider_id)}
                  onPress={() => toggleIn('watchProviderIds', p.provider_id)} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={yearPicker !== null} transparent animationType="fade" onRequestClose={() => setYearPicker(null)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setYearPicker(null)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <Text style={styles.pickerTitle}>{yearPicker === 'from' ? 'From year' : 'To year'}</Text>
            <FlatList
              data={['Any', ...YEARS] as Array<'Any' | number>}
              keyExtractor={(item) => String(item)}
              style={styles.pickerList}
              renderItem={({ item }) => {
                const value = item === 'Any' ? undefined : item;
                const current = yearPicker === 'from' ? draft.yearFrom : draft.yearTo;
                const active = current === value;
                return (
                  <Pressable style={[styles.pickerRow, active && styles.pickerRowActive]} onPress={() => pickYear(value)}>
                    <Text style={[styles.pickerRowText, active && { color: colors.primary, fontWeight: '700' }]}>{String(item)}</Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.footer}>
        <Pressable style={styles.resetBtn} onPress={() => setDraft({ sortBy: 'popularity.desc' })}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </Pressable>
        <Pressable style={styles.applyBtn} onPress={apply}>
          <Text style={styles.applyBtnText}>Apply Filters</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionHint: { ...typography.micro, color: colors.textMuted, paddingHorizontal: spacing.xl, marginTop: -spacing.xs, marginBottom: spacing.sm, fontStyle: 'italic' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xl },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  chipText: { ...typography.caption, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  yearField: { flex: 1, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' },
  yearFieldLabel: { ...typography.micro, color: colors.textMuted },
  yearFieldValue: { ...typography.bodyBold, color: colors.textSecondary, marginTop: 2 },
  yearDash: { ...typography.body, color: colors.textMuted },
  pickerOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xxxl },
  pickerCard: { backgroundColor: colors.surfaceElevated, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.divider, maxHeight: '65%', paddingVertical: spacing.md },
  pickerTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  pickerList: { paddingHorizontal: spacing.md },
  pickerRow: { paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  pickerRowActive: { backgroundColor: colors.primaryMuted },
  pickerRowText: { ...typography.body, color: colors.textSecondary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  resetBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, alignItems: 'center' },
  resetBtnText: { ...typography.bodyBold, color: colors.textMuted },
  applyBtn: { flex: 2, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center' },
  applyBtnText: { ...typography.bodyBold, color: '#0f1023' },
});
