import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';
import { WatchProviderCountry } from '../../services/tmdb/types';

interface MediaInfoProps {
  releaseDate?: string;
  status?: string;
  network?: string;
  originCountry?: string[];
  originalLanguage?: string;
  genres?: string[];
  runtime?: number;
  seasonCount?: number;
  episodeCount?: number;
  watchProviders?: WatchProviderCountry;
}

export function MediaInfo({
  releaseDate, status, network, originCountry, originalLanguage,
  genres, runtime, seasonCount, episodeCount, watchProviders,
}: MediaInfoProps) {
  const infoItems: Array<{ label: string; value: string }> = [];

  if (releaseDate) infoItems.push({ label: 'Release Date', value: formatDate(releaseDate) });
  if (status) infoItems.push({ label: 'Status', value: status });
  if (network) infoItems.push({ label: 'Network', value: network });
  if (originCountry?.length) infoItems.push({ label: 'Country', value: originCountry.join(', ') });
  if (originalLanguage) infoItems.push({ label: 'Language', value: getLanguageName(originalLanguage) });
  if (genres?.length) infoItems.push({ label: 'Genres', value: genres.slice(0, 3).join(', ') });
  if (runtime) infoItems.push({ label: 'Runtime', value: `${runtime} min` });
  if (seasonCount) infoItems.push({ label: 'Seasons', value: String(seasonCount) });
  if (episodeCount) infoItems.push({ label: 'Episodes', value: String(episodeCount) });

  const streamingOn = watchProviders?.flatrate ?? [];
  const rentOn = watchProviders?.rent ?? [];
  const buyOn = watchProviders?.buy ?? [];

  if (infoItems.length === 0 && streamingOn.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Info grid */}
      {infoItems.length > 0 && (
        <View style={styles.grid}>
          {infoItems.map((item, idx) => (
            <View key={idx} style={styles.gridItem}>
              <Text style={styles.gridLabel}>{item.label}</Text>
              <Text style={styles.gridValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Streaming services */}
      {streamingOn.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming On</Text>
          <View style={styles.providers}>
            {streamingOn.map((p) => (
              <View key={p.provider_id} style={styles.provider}>
                <Image source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }} style={styles.providerLogo} />
                <Text style={styles.providerName} numberOfLines={1}>{p.provider_name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Rent / Buy */}
      {rentOn.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available to Rent</Text>
          <View style={styles.providers}>
            {rentOn.slice(0, 5).map((p) => (
              <View key={p.provider_id} style={styles.provider}>
                <Image source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }} style={styles.providerLogo} />
                <Text style={styles.providerName} numberOfLines={1}>{p.provider_name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {buyOn.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available to Buy</Text>
          <View style={styles.providers}>
            {buyOn.slice(0, 5).map((p) => (
              <View key={p.provider_id} style={styles.provider}>
                <Image source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }} style={styles.providerLogo} />
                <Text style={styles.providerName} numberOfLines={1}>{p.provider_name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getLanguageName(code: string): string {
  const langs: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
    pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi',
    ar: 'Arabic', ru: 'Russian', nl: 'Dutch', sv: 'Swedish', da: 'Danish',
    no: 'Norwegian', fi: 'Finnish', pl: 'Polish', tr: 'Turkish', th: 'Thai',
    ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', kn: 'Kannada', mr: 'Marathi',
    bn: 'Bengali', pa: 'Punjabi', gu: 'Gujarati', ur: 'Urdu',
  };
  return langs[code] ?? code.toUpperCase();
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  gridItem: { width: '47%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radii.sm, padding: spacing.sm },
  gridLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  gridValue: { ...typography.caption, color: colors.textPrimary, fontWeight: '500', marginTop: 2 },
  section: { marginTop: spacing.md },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  provider: { alignItems: 'center', width: 60 },
  providerLogo: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.surfaceCard },
  providerName: { ...typography.micro, color: colors.textMuted, marginTop: 4, textAlign: 'center', fontSize: 9 },
});
