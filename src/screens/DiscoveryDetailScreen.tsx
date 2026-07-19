import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../core/theme/tokens';
import { Badge } from '../core/components/Badge';
import { CachedImage } from '../core/components/CachedImage';
import { RatingsBar } from '../core/components/RatingsBar';
import { MediaInfo } from '../core/components/MediaInfo';
import { Carousel } from '../core/components/Carousel';
import { PosterCard } from '../core/components/PosterCard';
import { CastCard } from '../core/components/CastCard';
import { useLibraryStore } from '../stores/libraryStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { posterUrl, backdropUrl, profileUrl, WatchProviderCountry, TMDBCredits, TMDBMovie, TMDBShow, TMDBVideo, TMDBCollection } from '../services/tmdb/types';
import { AddItemSheet } from '../services/shared-arr/components/AddItemSheet';
import { OMDBRatings } from '../services/omdb/client';
import { fetchOMDBRatings } from '../services/omdb/fetchRatings';
import { tmdb } from '../services/tmdb/instance';

export function DiscoveryDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { item, type } = route.params ?? {};
  const getEntry = useLibraryStore((s) => s.getEntry);
  const getBadge = useLibraryStore((s) => s.getBadge);
  const region = useSettingsStore((s) => s.region);
  const watchlistHas = useWatchlistStore((s) => s.has);
  const watchlistToggle = useWatchlistStore((s) => s.toggle);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addedStatus, setAddedStatus] = useState<'added' | 'added_searching' | null>(null);

  const [omdbRatings, setOmdbRatings] = useState<OMDBRatings | null>(null);
  const [watchProviders, setWatchProviders] = useState<WatchProviderCountry | undefined>();
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [resolvedId, setResolvedId] = useState<number | undefined>();
  const [credits, setCredits] = useState<TMDBCredits | null>(null);
  const [recommended, setRecommended] = useState<Array<TMDBMovie | TMDBShow>>([]);
  const [similar, setSimilar] = useState<Array<TMDBMovie | TMDBShow>>([]);
  const [trailer, setTrailer] = useState<TMDBVideo | null>(null);
  const [collection, setCollection] = useState<TMDBCollection | null>(null);

  // Resolve TMDB ID, different sources provide IDs differently:
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
    } else {
      // For TV: TMDB items have id (TMDB ID), Sonarr items have tvdbId (NOT TMDB ID)
      if (item.poster_path) {
        // This is a TMDB item, id is TMDB ID
        resolvedTmdbId = item.id;
      } else if (item.imdbId) {
        // Sonarr item with IMDB ID, exact lookup via TMDB /find
        const found = await tmdb.findByExternalId(item.imdbId, 'imdb_id').catch(() => ({ tv_results: [], movie_results: [] }));
        resolvedTmdbId = found.tv_results[0]?.id;
      } else if (item.tvdbId) {
        // Sonarr item with TVDB ID, exact lookup via TMDB /find
        const found = await tmdb.findByExternalId(String(item.tvdbId), 'tvdb_id').catch(() => ({ tv_results: [], movie_results: [] }));
        resolvedTmdbId = found.tv_results[0]?.id;
      }
      // No fuzzy search fallback, if we can't get an exact match, render with Sonarr data only
    }

    if (!cancelled.value) setResolvedId(resolvedTmdbId);

    let fetchedDetails: any = null;
    if (resolvedTmdbId) {
      const id = resolvedTmdbId;
      const isMovie = type === 'movie';
      const d = await (isMovie ? tmdb.getMovieDetails(id) : tmdb.getShowDetails(id)).catch(() => null);
      fetchedDetails = d;
      if (!cancelled.value && d) {
        setDetails(d);
        if (isMovie && (d as any).belongs_to_collection?.id) {
          tmdb.getCollection((d as any).belongs_to_collection.id)
            .then((c) => { if (!cancelled.value) setCollection(c); }).catch(() => {});
        }
      }
      // Each row loads independently; failures degrade to hidden sections
      (isMovie ? tmdb.getMovieWatchProviders(id) : tmdb.getTVWatchProviders(id)).then(p => {
        if (!cancelled.value) setWatchProviders(p[region] ?? p['US'] ?? Object.values(p)[0]);
      }).catch(() => {});
      (isMovie ? tmdb.getMovieCredits(id) : tmdb.getShowCredits(id)).then(c => {
        if (!cancelled.value) setCredits(c);
      }).catch(() => {});
      (isMovie ? tmdb.getMovieRecommendations(id) : tmdb.getShowRecommendations(id)).then(r => {
        if (!cancelled.value) setRecommended(r.results ?? []);
      }).catch(() => {});
      (isMovie ? tmdb.getSimilarMovies(id) : tmdb.getSimilarShows(id)).then(r => {
        if (!cancelled.value) setSimilar(r.results ?? []);
      }).catch(() => {});
      (isMovie ? tmdb.getMovieVideos(id) : tmdb.getShowVideos(id)).then(videos => {
        if (cancelled.value) return;
        const pick = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
          ?? videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
          ?? videos.find(v => v.site === 'YouTube' && v.type === 'Teaser');
        setTrailer(pick ?? null);
      }).catch(() => {});
    }

    // Fetch OMDB ratings
    const title = item.title ?? item.name;
    const yearStr = item.first_air_date?.slice(0, 4) ?? item.release_date?.slice(0, 4);
    const year = item.year ?? (yearStr ? parseInt(yearStr) : undefined);
    fetchOMDBRatings({ imdbId: item.imdbId ?? fetchedDetails?.imdb_id, tmdbId: resolvedTmdbId, title, year, type })
      .then(r => { if (!cancelled.value) setOmdbRatings(r); }).catch(() => {});

    if (!cancelled.value) setLoadingDetails(false);
  };

  useEffect(() => {
    const cancelled = { value: false };
    resolveAndFetch(cancelled);
    return () => { cancelled.value = true; };
  }, [item?.id, item?.tmdbId, item?.tvdbId, type, region]);

  if (!item) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  // Use TMDB details for rendering when available, fall back to item data
  const title = details?.title ?? details?.name ?? item.title ?? item.name;
  const year = details?.first_air_date?.slice(0, 4) ?? details?.release_date?.slice(0, 4) ?? item.year ?? item.first_air_date?.slice(0, 4) ?? item.release_date?.slice(0, 4);
  const rating = details?.vote_average ?? item.vote_average;
  const overview = details?.overview ?? item.overview;
  const poster = details?.poster_path ? posterUrl(details.poster_path, 'w500') : (item.poster_path ? posterUrl(item.poster_path, 'w500') : item.images?.find((i: any) => i.coverType === 'poster')?.remoteUrl);
  const backdrop = details?.backdrop_path ? backdropUrl(details.backdrop_path) : (item.backdrop_path ? backdropUrl(item.backdrop_path) : item.images?.find((i: any) => i.coverType === 'fanart')?.remoteUrl);
  // Membership is keyed by TMDB id for both media types (fixes the old tvdb/tmdb mismatch)
  const membershipId = resolvedId ?? (type === 'movie' ? item.tmdbId ?? item.id : (item.poster_path ? item.id : undefined));
  const inLibrary = addedStatus !== null || !!getEntry(type, membershipId);
  const arrType = type === 'tv' ? 'sonarr' as const : 'radarr' as const;
  const onWatchlist = membershipId ? watchlistHas(membershipId, type) : false;

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
        {/* Hero, backdrop or solid fallback */}
        <View style={styles.heroContainer}>
          {backdrop ? (
            <CachedImage uri={backdrop} style={styles.backdrop as any} />
          ) : (
            <View style={styles.backdropFallback} />
          )}
          <LinearGradient
            colors={['rgba(15,16,35,0.25)', 'rgba(15,16,35,0.55)', colors.surfaceBase]}
            locations={[0, 0.65, 1]}
            style={styles.heroOverlay}
          />
          <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          {membershipId ? (
            <Pressable
              style={[styles.bookmarkButton, { top: insets.top + 8 }]}
              onPress={() => watchlistToggle({
                tmdbId: membershipId, type,
                title: title ?? '', posterPath: details?.poster_path ?? item.poster_path ?? null,
                genreIds: item.genre_ids ?? details?.genres?.map((g: any) => g.id) ?? [],
              })}
            >
              <Ionicons name={onWatchlist ? 'bookmark' : 'bookmark-outline'} size={20} color={onWatchlist ? colors.primary : '#fff'} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.heroContent}>
          {poster ? (
            <CachedImage uri={poster} style={styles.poster as any} />
          ) : (
            <View style={styles.posterFallback}>
              <Text style={styles.posterFallbackText}>{(title ?? '').slice(0, 2)}</Text>
            </View>
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {year}{runtime ? ` · ${runtime}min` : ''}{network ? ` · ${network}` : ''}
            </Text>
            {addedStatus === 'added_searching' && <Badge label="↓ Searching..." variant="downloading" style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
            {addedStatus === 'added' && <Badge label="Missing" variant="missing" style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
            {!addedStatus && inLibrary && <Badge label="In Library" variant="inLibrary" style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
          </View>
        </View>

        {loadingDetails && (
          <View style={styles.detailsLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.detailsLoadingText}>Loading details...</Text>
          </View>
        )}

        <RatingsBar ratings={omdbRatings} tmdbRating={rating} title={title} imdbId={imdbId} tmdbId={tmdbIdResolved} type={type} />

        {trailer && (
          <View style={styles.section}>
            <Pressable style={styles.trailerButton} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`)}>
              <Ionicons name="play" size={16} color={colors.primary} />
              <Text style={styles.trailerButtonText}>Play Trailer</Text>
            </Pressable>
          </View>
        )}

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

        {(credits?.cast?.length ?? 0) > 0 && (
          <View style={styles.carouselSection}>
            <Carousel title="Cast" status="loaded" minHeight={140}>
              {credits!.cast.slice(0, 15).map((c) => (
                <CastCard key={c.id} name={c.name} role={c.character} imageUrl={profileUrl(c.profile_path)}
                  onPress={() => navigation.push('Person', { personId: c.id })} />
              ))}
            </Carousel>
          </View>
        )}

        {collection && collection.parts?.length > 1 && (
          <View style={styles.carouselSection}>
            <Carousel title={collection.name} status="loaded">
              {collection.parts.map((m) => (
                <PosterCard key={m.id} title={m.title} subtitle={m.release_date?.slice(0, 4)}
                  posterUrl={posterUrl(m.poster_path)} rating={m.vote_average || undefined} size="md"
                  badge={getBadge('movie', m.id)}
                  onPress={() => navigation.push('DiscoveryDetail', { item: m, type: 'movie' })} />
              ))}
            </Carousel>
          </View>
        )}

        {recommended.length > 0 && (
          <View style={styles.carouselSection}>
            <Carousel title="Recommended" status="loaded">
              {recommended.map((r: any) => (
                <PosterCard key={r.id} title={r.title ?? r.name} subtitle={(r.release_date ?? r.first_air_date)?.slice(0, 4)}
                  posterUrl={posterUrl(r.poster_path)} rating={r.vote_average || undefined} size="md"
                  badge={getBadge(type, r.id)}
                  onPress={() => navigation.push('DiscoveryDetail', { item: r, type })} />
              ))}
            </Carousel>
          </View>
        )}

        {similar.length > 0 && (
          <View style={styles.carouselSection}>
            <Carousel title="Similar Titles" status="loaded">
              {similar.map((r: any) => (
                <PosterCard key={r.id} title={r.title ?? r.name} subtitle={(r.release_date ?? r.first_air_date)?.slice(0, 4)}
                  posterUrl={posterUrl(r.poster_path)} rating={r.vote_average || undefined} size="md"
                  badge={getBadge(type, r.id)}
                  onPress={() => navigation.push('DiscoveryDetail', { item: r, type })} />
              ))}
            </Carousel>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddItemSheet
        visible={showAddSheet}
        type={arrType}
        item={{ ...item, ...(details ? { number_of_seasons: details.number_of_seasons, seasons: details.seasons } : {}) }}
        onDismiss={() => setShowAddSheet(false)}
        onAdded={(status) => setAddedStatus(status)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  heroContainer: { height: 220, position: 'relative' },
  backdrop: { width: '100%', height: 220 },
  backdropFallback: { width: '100%', height: 220, backgroundColor: colors.surfaceElevated },
  heroOverlay: { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(15,16,35,0.5)' },
  backButton: { position: 'absolute', left: spacing.lg, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  bookmarkButton: { position: 'absolute', right: spacing.lg, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  trailerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.md, padding: spacing.md },
  trailerButtonText: { ...typography.bodyBold, color: colors.primary },
  carouselSection: { marginTop: spacing.xl },
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
