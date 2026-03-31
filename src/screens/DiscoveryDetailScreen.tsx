import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../core/theme/tokens';
import { Badge } from '../core/components/Badge';
import { CachedImage } from '../core/components/CachedImage';
import { RatingsBar } from '../core/components/RatingsBar';
import { MediaInfo } from '../core/components/MediaInfo';
import { useLibraryCache } from '../stores/libraryCache';
import { posterUrl, backdropUrl, WatchProviderCountry } from '../services/tmdb/types';
import { AddItemSheet } from '../services/shared-arr/components/AddItemSheet';
import { OMDBRatings } from '../services/omdb/client';
import { fetchOMDBRatings } from '../services/omdb/fetchRatings';
import { tmdb } from '../services/tmdb/instance';

export function DiscoveryDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { item, type } = route.params ?? {}; // type: 'tv' | 'movie'
  const isInSonarr = useLibraryCache((s) => s.isInSonarr);
  const isInRadarr = useLibraryCache((s) => s.isInRadarr);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Extra metadata
  const [omdbRatings, setOmdbRatings] = useState<OMDBRatings | null>(null);
  const [watchProviders, setWatchProviders] = useState<WatchProviderCountry | undefined>();
  const [details, setDetails] = useState<any>(null);

  const tmdbId = item?.id ?? item?.tmdbId;

  useEffect(() => {
    if (!tmdbId) return;
    let cancelled = false;
    const itemTitle = type === 'tv' ? (item?.name ?? item?.title) : item?.title;

    // Fetch full details from TMDB
    if (type === 'tv') {
      tmdb.getShowDetails(tmdbId).then((d) => { if (!cancelled) setDetails(d); }).catch(() => {});
      tmdb.getTVWatchProviders(tmdbId).then((p) => {
        if (!cancelled) setWatchProviders(p['US'] ?? p['GB'] ?? Object.values(p)[0]);
      }).catch(() => {});
    } else {
      tmdb.getMovieDetails(tmdbId).then((d) => { if (!cancelled) setDetails(d); }).catch(() => {});
      tmdb.getMovieWatchProviders(tmdbId).then((p) => {
        if (!cancelled) setWatchProviders(p['US'] ?? p['GB'] ?? Object.values(p)[0]);
      }).catch(() => {});
    }

    // Fetch OMDB ratings via helper (tries imdbId → TMDB external IDs → title)
    fetchOMDBRatings({
      imdbId: item?.imdbId,
      tmdbId,
      title: itemTitle,
      year: parseInt(type === 'tv' ? item?.first_air_date?.slice(0, 4) : item?.release_date?.slice(0, 4)) || undefined,
      type,
    }).then((r) => { if (!cancelled) setOmdbRatings(r); }).catch(() => {});

    return () => { cancelled = true; };
  }, [tmdbId, type]);

  if (!item) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  const title = type === 'tv' ? (item.name ?? item.title) : item.title;
  const year = type === 'tv' ? item.first_air_date?.slice(0, 4) : item.release_date?.slice(0, 4);
  const rating = item.vote_average;
  const overview = item.overview ?? details?.overview;
  const poster = posterUrl(item.poster_path, 'w500');
  const backdrop = backdropUrl(item.backdrop_path);
  const inLibrary = type === 'tv' ? isInSonarr(item.id) : isInRadarr(item.id);
  const arrType = type === 'tv' ? 'sonarr' as const : 'radarr' as const;

  // Build metadata from TMDB details
  const releaseDate = type === 'tv' ? (item.first_air_date ?? details?.first_air_date) : (item.release_date ?? details?.release_date);
  const originCountry = item.origin_country ?? details?.origin_country ?? details?.production_countries?.map((c: any) => c.iso_3166_1);
  const originalLanguage = item.original_language ?? details?.original_language;
  const genres = details?.genres?.map((g: any) => g.name);
  const runtime = details?.runtime ?? details?.episode_run_time?.[0];
  const seasonCount = details?.number_of_seasons;
  const episodeCount = details?.number_of_episodes;
  const network = details?.networks?.[0]?.name;
  const status = details?.status;

  return (
    <>
      <ScrollView style={styles.container}>
        {backdrop && <CachedImage uri={backdrop} style={styles.backdrop as any} />}
        <View style={styles.heroOverlay} />

        {/* Back button */}
        <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.heroContent}>
          {poster && <CachedImage uri={poster} style={styles.poster as any} />}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {year}{runtime ? ` · ${runtime}min` : ''}{network ? ` · ${network}` : ''}
            </Text>
            {inLibrary && <Badge label="In Library" variant="inLibrary" style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
          </View>
        </View>

        {/* Ratings */}
        <RatingsBar ratings={omdbRatings} tmdbRating={rating} title={title} imdbId={item?.imdbId ?? details?.imdb_id} tmdbId={tmdbId} type={type} />

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.overview}>{overview}</Text>
        </View>

        {/* Media info + streaming providers */}
        <MediaInfo
          releaseDate={releaseDate}
          status={status}
          network={network}
          originCountry={originCountry}
          originalLanguage={originalLanguage}
          genres={genres}
          runtime={runtime}
          seasonCount={seasonCount}
          episodeCount={episodeCount}
          watchProviders={watchProviders}
        />

        {/* Add buttons */}
        {!inLibrary && (
          <View style={styles.section}>
            <Pressable style={styles.addButton} onPress={() => setShowAddSheet(true)}>
              <Text style={styles.addButtonText}>Add to {type === 'tv' ? 'Sonarr' : 'Radarr'}</Text>
            </Pressable>
            <Pressable style={styles.addSearchButton} onPress={() => setShowAddSheet(true)}>
              <Text style={styles.addSearchButtonText}>Add + Search</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddItemSheet
        visible={showAddSheet}
        type={arrType}
        item={item}
        onDismiss={() => setShowAddSheet(false)}
        onAdded={() => {}}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  backdrop: { width: '100%', height: 220 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(15,16,35,0.5)' },
  backButton: { position: 'absolute', left: spacing.lg, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  heroContent: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.xl, marginTop: -60 },
  poster: { width: 100, height: 150, borderRadius: radii.md, overflow: 'hidden' },
  titleBlock: { flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  overview: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  addButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  addButtonText: { ...typography.bodyBold, color: '#0f1023' },
  addSearchButton: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  addSearchButtonText: { ...typography.bodyBold, color: colors.primary },
});
