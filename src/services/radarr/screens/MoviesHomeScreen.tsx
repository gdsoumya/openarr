import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../../core/theme/tokens';
import { Carousel } from '../../../core/components/Carousel';
import { PosterCard } from '../../../core/components/PosterCard';
import { SearchBar } from '../../../core/components/SearchBar';
import { Movie } from '../types';
import { TMDBMovie, posterUrl, profileUrl } from '../../tmdb/types';
import { CastCard } from '../../../core/components/CastCard';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getRadarrAdapter } from '../../../services/adapterFactory';
import { useLibraryStore } from '../../../stores/libraryStore';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';
import { useDebouncedValue } from '../../../core/hooks/useDebounce';
import { tmdb, isTmdbConfigured } from '../../tmdb/instance';
import { useWatchlistStore } from '../../../stores/watchlistStore';
import { DiscoveryRows } from '../../../screens/discover/DiscoveryRows';
import { DashboardButton } from '../../../core/components/DashboardButton';

type LoadStatus = 'loading' | 'loaded' | 'error' | 'empty';

interface QueueInfo { movieId?: number; title: string; progress: number; status: string; }

function getMovieBadge(m: Movie, queueMap?: Map<number, QueueInfo>) {
  const qi = queueMap?.get(m.id);
  if (qi) return { label: `↓ ${Math.round(qi.progress)}%`, variant: 'downloading' as const };

  if (m.hasFile && m.movieFile) {
    const q = m.movieFile.quality.quality.name;
    return { label: `✓ ${q}`, variant: 'completed' as const };
  }
  if (!m.hasFile && m.monitored) return { label: 'Missing', variant: 'missing' as const };
  if (m.monitored) return { label: 'Monitored', variant: 'monitored' as const };
  return undefined;
}

export function MoviesHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const config = useServiceConfig('radarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getRadarrAdapter(config, isLocal) : null, [config, isLocal]);
  const setMovies = useLibraryStore((s) => s.setMovies);
  const getLibBadge = useLibraryStore((s) => s.getBadge);
  const movieWatchlist = useWatchlistStore((s) => s.items).filter((w) => w.type === 'movie');

  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<Movie[]>([]);
  const [radarrSearchResults, setRadarrSearchResults] = useState<Movie[]>([]);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<TMDBMovie[]>([]);
  const [peopleResults, setPeopleResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [queueMap, setQueueMap] = useState<Map<number, QueueInfo>>(new Map());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const [libraryStatus, setLibraryStatus] = useState<LoadStatus>('loading');
  const [discoveryRefresh, setDiscoveryRefresh] = useState(0);

  const fetchData = useCallback(async () => {
    if (adapter) {
      setLibraryStatus('loading');
      try {
        const [movies, queueResult] = await Promise.all([
          adapter.getMovies(),
          adapter.getQueue(1, 50).catch(() => ({ records: [], totalRecords: 0, page: 1, pageSize: 50 })),
        ]);
        setLibrary(movies);
        // Build queue map: movieId → download info
        const qm = new Map<number, QueueInfo>();
        for (const qi of queueResult.records) {
          const progress = qi.size > 0 ? ((qi.size - qi.sizeleft) / qi.size) * 100 : 0;
          const movieId = (qi as any).movieId;
          if (movieId && !qm.has(movieId)) {
            qm.set(movieId, { movieId, title: qi.title, progress, status: qi.status });
          }
        }
        setQueueMap(qm);
        const progressByArrId = new Map<number, number>();
        qm.forEach((info, movieId) => progressByArrId.set(movieId, info.progress));
        setMovies(movies, progressByArrId);
        setLibraryStatus(movies.length > 0 ? 'loaded' : 'empty');
      } catch (e: any) {
        setLibraryStatus('error');
        showToast(`Radarr: ${e.message ?? 'Connection failed'}`, 'error');
      }
    } else {
      setLibraryStatus('empty');
    }

    setInitialLoading(false);
  }, [adapter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const debouncedQuery = useDebouncedValue(searchQuery, 400);
  const searchRequestId = useRef(0);

  const doSearch = useCallback(async (queryOverride?: string) => {
    const q = (queryOverride ?? debouncedQuery).trim();
    if (!q) { setRadarrSearchResults([]); setTmdbSearchResults([]); return; }
    const id = ++searchRequestId.current;
    setSearching(true);
    try {
      // Search both Radarr (if configured) AND TMDB in parallel for best results
      const promises: Promise<any>[] = [
        tmdb.searchMovies(q).catch(() => ({ results: [], totalResults: 0 })),
        tmdb.searchPeople(q).catch(() => ({ results: [] })),
      ];
      if (adapter) {
        promises.push(adapter.lookupMovie(q).catch(() => []));
      }
      const [tmdbResult, peopleResult, radarrResult] = await Promise.all(promises);
      if (id !== searchRequestId.current) return;
      setTmdbSearchResults(tmdbResult.results ?? []);
      setPeopleResults((peopleResult.results ?? []).filter((person: any) => person.profile_path).slice(0, 10));
      setRadarrSearchResults(radarrResult ?? []);
    } catch (e: any) {
      showToast(`Search failed: ${e.message}`, 'error');
    }
    if (id === searchRequestId.current) setSearching(false);
  }, [debouncedQuery, adapter]);

  // Search-as-you-type on the debounced query
  useEffect(() => { doSearch(); }, [doSearch]);

  useEffect(() => {
    if (!searchQuery.trim()) { setRadarrSearchResults([]); setTmdbSearchResults([]); setPeopleResults([]); }
  }, [searchQuery]);

  const libraryByTmdbId = useMemo(() => {
    const map = new Map<number, Movie>();
    library.forEach(m => map.set(m.tmdbId, m));
    return map;
  }, [library]);

  if (initialLoading) return <LoadingSpinner message="Loading movies..." />;

  const displayLibrary = searchQuery
    ? library.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : library;

  const isSearchMode = searchQuery.trim().length > 0;
  const hasSearchResults = radarrSearchResults.length > 0 || tmdbSearchResults.length > 0 || peopleResults.length > 0;
  const libraryTmdbIds = new Set(library.map(m => m.tmdbId));

  const openTmdbMovie = (m: { id: number; title?: string; poster_path?: string | null }) => {
    const match = libraryByTmdbId.get(m.id);
    if (match) navigation.navigate('MovieDetail', { movie: match });
    else navigation.navigate('DiscoveryDetail', { item: m, type: 'movie' });
  };

  const getTmdbMovieBadge = (tmdbItem: TMDBMovie) => {
    const match = libraryByTmdbId.get(tmdbItem.id);
    if (match) return getMovieBadge(match, queueMap) ?? { label: 'In Library', variant: 'inLibrary' as const };
    return undefined;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); setDiscoveryRefresh((n) => n + 1); await fetchData(); setRefreshing(false); }}
          tintColor={colors.primary}
        />
      }>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <DashboardButton />
          <Text style={styles.title}>Movies</Text>
        </View>
        {adapter && (
          <Pressable style={styles.syncChip} onPress={async () => {
            showToast('Syncing RSS feeds...', 'info');
            try { await adapter.rssSync(); showToast('RSS sync triggered', 'success'); }
            catch (e: any) { showToast(`Sync failed: ${e.message}`, 'error'); }
          }}>
            <Ionicons name="sync" size={14} color={colors.primary} />
            <Text style={styles.syncChipText}>RSS Sync</Text>
          </Pressable>
        )}
      </View>
      <SearchBar
        placeholder="Search for movies to add..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={() => doSearch(searchQuery)}
      />

      {!config && !isSearchMode && (
        <View style={styles.notConfigured}>
          <Text style={styles.notConfiguredText}>Radarr not configured. Add it in Settings to manage your library.</Text>
        </View>
      )}

      {/* Search results */}
      {isSearchMode && (
        <>
          {searching && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}

          {/* Radarr lookup results — ready to add directly */}
          {!searching && radarrSearchResults.length > 0 && (
            <Carousel title="From Radarr (ready to add)" count={radarrSearchResults.length} status="loaded">
              {radarrSearchResults.map((m, idx) => {
                const inLibrary = libraryTmdbIds.has(m.tmdbId);
                return (
                  <PosterCard key={`radarr-${m.tmdbId}-${idx}`} title={m.title}
                    subtitle={`${m.year ?? ''} · ${m.genres?.[0] ?? ''}`}
                    posterUrl={m.images?.find(i => i.coverType === 'poster')?.remoteUrl}
                    badge={inLibrary ? { label: 'In Library', variant: 'inLibrary' } : undefined}
                    onPress={() => {
                      if (inLibrary) {
                        const existing = library.find(l => l.tmdbId === m.tmdbId);
                        if (existing) navigation.navigate('MovieDetail', { movie: existing });
                      } else {
                        navigation.navigate('DiscoveryDetail', { item: m, type: 'movie' });
                      }
                    }} />
                );
              })}
            </Carousel>
          )}

          {/* TMDB search results — broader discovery */}
          {!searching && tmdbSearchResults.length > 0 && (
            <Carousel title="From TMDB" count={tmdbSearchResults.length} status="loaded">
              {tmdbSearchResults.map((m, idx) => (
                <PosterCard key={`tmdb-${m.id}-${idx}`} title={m.title} subtitle={`${m.release_date?.slice(0, 4) ?? ''} · ★ ${m.vote_average?.toFixed(1) ?? ''}`}
                  posterUrl={posterUrl(m.poster_path)} rating={m.vote_average} size="md"
                  badge={getTmdbMovieBadge(m)}
                  onPress={() => openTmdbMovie(m)} />
              ))}
            </Carousel>
          )}

          {!searching && peopleResults.length > 0 && (
            <Carousel title="People" count={peopleResults.length} status="loaded" minHeight={140}>
              {peopleResults.map((person) => (
                <CastCard key={person.id} name={person.name} role={person.known_for_department}
                  imageUrl={profileUrl(person.profile_path)}
                  onPress={() => navigation.navigate('Person', { personId: person.id })} />
              ))}
            </Carousel>
          )}

          {!searching && !hasSearchResults && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Press return to search.</Text>
            </View>
          )}
        </>
      )}

      {/* Library — filtered when searching */}
      {displayLibrary.length > 0 && (
        <Carousel title={isSearchMode ? 'In Your Library' : 'My Library'} count={displayLibrary.length}
          status={!config ? 'empty' : libraryStatus}>
          {displayLibrary.map((m) => (
            <PosterCard key={m.id} title={m.title} subtitle={`${m.year} · ${m.genres?.[0] ?? ''}`}
              posterUrl={m.images?.find(i => i.coverType === 'poster')?.remoteUrl}
              badge={getMovieBadge(m, queueMap)}
              progress={queueMap?.has(m.id) ? (queueMap.get(m.id)!.progress / 100) : undefined}
              onPress={() => navigation.navigate('MovieDetail', { movie: m })} />
          ))}
        </Carousel>
      )}

      {/* Discovery rows — hide when searching */}
      {!isSearchMode && (
        <>
          {movieWatchlist.length > 0 && (
            <Carousel title="My Watchlist" count={movieWatchlist.length} status="loaded">
              {movieWatchlist.map((w) => (
                <PosterCard key={w.tmdbId} title={w.title}
                  posterUrl={posterUrl(w.posterPath)} size="md"
                  badge={getLibBadge('movie', w.tmdbId)}
                  onPress={() => openTmdbMovie({ id: w.tmdbId, title: w.title, poster_path: w.posterPath })} />
              ))}
            </Carousel>
          )}
          {!isTmdbConfigured() && (
            <View style={styles.notConfigured}>
              <Text style={styles.notConfiguredText}>Discovery is disabled — add a TMDB API token in Settings → Discovery.</Text>
            </View>
          )}
          <DiscoveryRows
            mediaType="movie"
            refreshToken={discoveryRefresh}
            onItemPress={(item: any) => openTmdbMovie(item)}
            getItemBadge={(item: any) => getTmdbMovieBadge(item)}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { paddingBottom: 8 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h1, color: colors.textPrimary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  syncChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  syncChipText: { ...typography.micro, color: colors.primary, fontWeight: '600' },
  notConfigured: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
  notConfiguredText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  searchingText: { ...typography.caption, color: colors.textMuted },
  noResults: { padding: spacing.xl, alignItems: 'center' },
  noResultsText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
