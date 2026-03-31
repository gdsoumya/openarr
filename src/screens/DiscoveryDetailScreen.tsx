import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
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
  const { item, type } = route.params ?? {};
  const isInSonarr = useLibraryCache((s) => s.isInSonarr);
  const isInRadarr = useLibraryCache((s) => s.isInRadarr);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const [omdbRatings, setOmdbRatings] = useState<OMDBRatings | null>(null);
  const [watchProviders, setWatchProviders] = useState<WatchProviderCountry | undefined>();
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Resolve TMDB ID — different sources provide IDs differently:
  // - TMDB search results: item.id IS the TMDB ID
  // - Radarr lookup: item.tmdbId IS the TMDB ID
  // - Sonarr lookup: item.tvdbId is TVDB, need to search TMDB by title
  const resolveAndFetch = async (cancelled: { value: boolean }) => {
    if (!item) return;
    setLoadingDetails(true);

    let resolvedTmdbId: number | undefined;

    if (type === 'movie') {
      // Radarr items have tmdbId, TMDB items have id
      resolvedTmdbId = item.tmdbId ?? item.id;
      if (resolvedTmdbId) {
        const d = await tmdb.getMovieDetails(resolvedTmdbId).catch(() => null);
        if (!cancelled.value && d) setDetails(d);
        tmdb.getMovieWatchProviders(resolvedTmdbId).then(p => {
          if (!cancelled.value) setWatchProviders(p['US'] ?? p['GB'] ?? Object.values(p)[0]);
        }).catch(() => {});
      }
    } else {
      // For TV: TMDB items have id (TMDB ID), Sonarr items have tvdbId (NOT TMDB ID)
      if (item.poster_path) {
        // This is a TMDB item — id is TMDB ID
        resolvedTmdbId = item.id;
      } else {
        // Sonarr lookup — search TMDB by title to get TMDB ID
        const searchResult = await tmdb.searchTV(item.title ?? item.name, 1).catch(() => ({ results: [] }));
        resolvedTmdbId = searchResult.results?.[0]?.id;
      }
      if (resolvedTmdbId) {
        const d = await tmdb.getShowDetails(resolvedTmdbId).catch(() => null);
        if (!cancelled.value && d) setDetails(d);
        tmdb.getTVWatchProviders(resolvedTmdbId).then(p => {
          if (!cancelled.value) setWatchProviders(p['US'] ?? p['GB'] ?? Object.values(p)[0]);
        }).catch(() => {});
      }
    }

    // Fetch OMDB ratings
    const title = item.title ?? item.name;
    const year = item.year ?? parseInt(item.first_air_date?.slice(0, 4) ?? item.release_date?.slice(0, 4)) || undefined;
    fetchOMDBRatings({ imdbId: item.imdbId ?? details?.imdb_id, tmdbId: resolvedTmdbId, title, year, type })
      .then(r => { if (!cancelled.value) setOmdbRatings(r); }).catch(() => {});

    if (!cancelled.value) setLoadingDetails(false);
  };

  useEffect(() => {
    const cancelled = { value: false };
    resolveAndFetch(cancelled);
    return () => { cancelled.value = true; };
  }, [item?.id, item?.tmdbId, item?.tvdbId, type]);

  if (!item) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  // Use TMDB details for rendering when available, fall back to item data
  const title = details?.title ?? details?.name ?? item.title ?? item.name;
  const year = details?.first_air_date?.slice(0, 4) ?? details?.release_date?.slice(0, 4) ?? item.year ?? item.first_air_date?.slice(0, 4) ?? item.release_date?.slice(0, 4);
  const rating = details?.vote_average ?? item.vote_average;
  const overview = details?.overview ?? item.overview;
  const poster = details?.poster_path ? posterUrl(details.poster_path, 'w500') : (item.poster_path ? posterUrl(item.poster_path, 'w500') : item.images?.find((i: any) => i.coverType === 'poster')?.remoteUrl);
  const backdrop = details?.backdrop_path ? backdropUrl(details.backdrop_path) : (item.backdrop_path ? backdropUrl(item.backdrop_path) : item.images?.find((i: any) => i.coverType === 'fanart')?.remoteUrl);
  const inLibrary = type === 'tv' ? isInSonarr(item.tvdbId ?? item.id) : isInRadarr(item.tmdbId ?? item.id);
  const arrType = type === 'tv' ? 'sonarr' as const : 'radarr' as const;

  const releaseDate = details?.first_air_date ?? details?.release_date ?? item.first_air_date ?? item.release_date ?? item.firstAired;
  const originCountry = details?.origin_country ?? details?.production_countries?.map((c: any) => c.iso_3166_1);
  const originalLanguage = details?.original_language ?? item.original_language;
  const genres = details?.genres?.map((g: any) => g.name) ?? item.genres;
  const runtime = details?.runtime ?? details?.episode_run_time?.[0] ?? item.runtime;
  const seasonCount = details?.number_of_seasons ?? item.seasonCount;
  const episodeCount = details?.number_of_episodes ?? item.totalEpisodeCount;
  const network = details?.networks?.[0]?.name ?? item.network;
  const status = details?.status ?? item.status;
  const imdbId = details?.imdb_id ?? item.imdbId;
  const tmdbIdResolved = details?.id ?? item.tmdbId ?? item.id;

  return (
    <>
      <ScrollView style={styles.container}>
        {backdrop && <CachedImage uri={backdrop} style={styles.backdrop as any} />}
        <View style={styles.heroOverlay} />

        <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.heroContent}>
          {poster ? (
            <CachedImage uri={poster} style={styles.poster as any} />
          ) : (
            <View style={[styles.posterFallback]}>
              <Text style={styles.posterFallbackText}>{(title ?? '').slice(0, 2)}</Text>
            </View>
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {year}{runtime ? ` · ${runtime}min` : ''}{network ? ` · ${network}` : ''}
            </Text>
            {inLibrary && <Badge label="In Library" variant="inLibrary" style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
          </View>
        </View>

        {loadingDetails && (
          <View style={styles.detailsLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.detailsLoadingText}>Loading details...</Text>
          </View>
        )}

        <RatingsBar ratings={omdbRatings} tmdbRating={rating} title={title} imdbId={imdbId} tmdbId={tmdbIdResolved} type={type} />

        {overview ? (
          <View style={styles.section}>
            <Text style={styles.overview}>{overview}</Text>
          </View>
        ) : null}

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
  posterFallback: { width: 100, height: 150, borderRadius: radii.md, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  posterFallbackText: { fontSize: 32, fontWeight: '700', color: 'rgba(255,255,255,0.15)' },
  titleBlock: { flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  detailsLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  detailsLoadingText: { ...typography.caption, color: colors.textMuted },
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  overview: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  addButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  addButtonText: { ...typography.bodyBold, color: '#0f1023' },
  addSearchButton: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  addSearchButtonText: { ...typography.bodyBold, color: colors.primary },
});
