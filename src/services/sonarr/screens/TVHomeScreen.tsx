import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../../core/theme/tokens';
import { Carousel } from '../../../core/components/Carousel';
import { PosterCard } from '../../../core/components/PosterCard';
import { SearchBar } from '../../../core/components/SearchBar';
import { useLibraryStore } from '../../../stores/libraryStore';
import { Series } from '../types';
import { TMDBShow, posterUrl, profileUrl } from '../../tmdb/types';
import { CastCard } from '../../../core/components/CastCard';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getSonarrAdapter } from '../../../services/adapterFactory';
import { LoadingSpinner } from '../../../core/components/LoadingSpinner';
import { useToastStore } from '../../../core/hooks/useToast';
import { useDebouncedValue } from '../../../core/hooks/useDebounce';
import { tmdb, isTmdbConfigured } from '../../tmdb/instance';
import { useWatchlistStore } from '../../../stores/watchlistStore';
import { DiscoveryRows } from '../../../screens/discover/DiscoveryRows';
import { DashboardButton } from '../../../core/components/DashboardButton';

type LoadStatus = 'loading' | 'loaded' | 'error' | 'empty';

interface QueueInfo { seriesId?: number; movieId?: number; title: string; progress: number; }

function getSeriesBadge(s: Series, queueMap?: Map<number, QueueInfo>) {
  // Check if downloading
  const qi = queueMap?.get(s.id);
  if (qi) return { label: `↓ ${Math.round(qi.progress)}%`, variant: 'downloading' as const };

  const st = s.statistics;
  if (!st) return undefined;
  if (st.episodeFileCount === st.totalEpisodeCount && st.totalEpisodeCount > 0) return { label: '✓ All', variant: 'completed' as const };
  const missing = st.episodeCount - st.episodeFileCount;
  if (missing > 0) return { label: `${missing} missing`, variant: 'missing' as const };
  if (s.monitored) return { label: 'Monitored', variant: 'monitored' as const };
  return undefined;
}

export function TVHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const config = useServiceConfig('sonarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getSonarrAdapter(config, isLocal) : null, [config, isLocal]);
  const setShows = useLibraryStore((s) => s.setShows);
  const libraryShows = useLibraryStore((s) => s.shows);
  const getBadge = useLibraryStore((s) => s.getBadge);
  const tvWatchlist = useWatchlistStore((s) => s.items).filter((w) => w.type === 'tv');

  const [searchQuery, setSearchQuery] = useState('');
  const [library, setLibrary] = useState<Series[]>([]);
  // Search results — Sonarr lookup returns Series[], TMDB returns TMDBShow[]
  const [sonarrSearchResults, setSonarrSearchResults] = useState<Series[]>([]);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<TMDBShow[]>([]);
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
        const [series, queueResult] = await Promise.all([
          adapter.getSeries(),
          adapter.getQueue(1, 50).catch(() => ({ records: [], totalRecords: 0, page: 1, pageSize: 50 })),
        ]);
        setLibrary(series);
        // Build queue map: seriesId → download info
        const qm = new Map<number, QueueInfo>();
        for (const qi of queueResult.records) {
          const progress = qi.size > 0 ? ((qi.size - qi.sizeleft) / qi.size) * 100 : 0;
          // Queue items have seriesId in Sonarr (not in our QueueItem type but the API returns it)
          const seriesId = (qi as any).seriesId;
          if (seriesId && !qm.has(seriesId)) {
            qm.set(seriesId, { seriesId, title: qi.title, progress });
          }
        }
        setQueueMap(qm);
        const progressByArrId = new Map<number, number>();
        qm.forEach((info, seriesId) => progressByArrId.set(seriesId, info.progress));
        setShows(series, progressByArrId).catch(() => {});
        setLibraryStatus(series.length > 0 ? 'loaded' : 'empty');
      } catch (e: any) {
        setLibraryStatus('error');
        showToast(`Sonarr: ${e.message ?? 'Connection failed'}`, 'error');
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
    if (!q) { setSonarrSearchResults([]); setTmdbSearchResults([]); return; }
    const id = ++searchRequestId.current;
    setSearching(true);
    try {
      // Search both Sonarr (if configured) AND TMDB in parallel for best results
      const promises: Promise<any>[] = [
        tmdb.searchTV(q).catch(() => ({ results: [], totalResults: 0 })),
        tmdb.searchPeople(q).catch(() => ({ results: [] })),
      ];
      if (adapter) {
        promises.push(adapter.lookupSeries(q).catch(() => []));
      }
      const [tmdbResult, peopleResult, sonarrResult] = await Promise.all(promises);
      if (id !== searchRequestId.current) return;
      setTmdbSearchResults(tmdbResult.results ?? []);
      setPeopleResults((peopleResult.results ?? []).filter((person: any) => person.profile_path).slice(0, 10));
      setSonarrSearchResults(sonarrResult ?? []);
    } catch (e: any) {
      showToast(`Search failed: ${e.message}`, 'error');
    }
    if (id === searchRequestId.current) setSearching(false);
  }, [debouncedQuery, adapter]);

  // Search-as-you-type on the debounced query
  useEffect(() => { doSearch(); }, [doSearch]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSonarrSearchResults([]); setTmdbSearchResults([]); setPeopleResults([]); }
  }, [searchQuery]);

  // Must be before any early returns — Rules of Hooks
  const libraryByArrId = useMemo(() => {
    const map = new Map<number, Series>();
    library.forEach(s => map.set(s.id, s));
    return map;
  }, [library]);

  // Resolve a TMDB show to its library Series (tmdbId-keyed, not title matching)
  const libraryMatch = useCallback((tmdbId: number): Series | undefined => {
    const entry = libraryShows.get(tmdbId);
    return entry ? libraryByArrId.get(entry.arrId) : undefined;
  }, [libraryShows, libraryByArrId]);

  if (initialLoading) return <LoadingSpinner message="Loading TV shows..." />;

  const displayLibrary = searchQuery
    ? library.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : library;

  const isSearchMode = searchQuery.trim().length > 0;
  const hasSearchResults = sonarrSearchResults.length > 0 || tmdbSearchResults.length > 0 || peopleResults.length > 0;
  const libraryTvdbIds = new Set(library.map(s => s.tvdbId));

  const getTmdbItemBadge = (tmdbItem: TMDBShow) => {
    const match = libraryMatch(tmdbItem.id);
    if (match) return getSeriesBadge(match, queueMap) ?? { label: 'In Library', variant: 'inLibrary' as const };
    return undefined;
  };

  const openTmdbShow = (s: TMDBShow) => {
    const match = libraryMatch(s.id);
    if (match) navigation.navigate('SeriesDetail', { series: match });
    else navigation.navigate('DiscoveryDetail', { item: s, type: 'tv' });
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
        <Text style={styles.title}>TV Shows</Text>
        <View style={styles.headerActions}>
        <DashboardButton />
        {adapter && (
          <Pressable style={styles.syncBtn} onPress={async () => {
            showToast('Syncing RSS feeds...', 'info');
            try { await adapter.rssSync(); showToast('RSS sync triggered', 'success'); }
            catch (e: any) { showToast(`Sync failed: ${e.message}`, 'error'); }
          }}>
            <Ionicons name="sync" size={20} color={colors.textMuted} />
          </Pressable>
        )}
        </View>
      </View>
      <SearchBar
        placeholder="Search for shows to add..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={() => doSearch(searchQuery)}
      />

      {!config && !isSearchMode && (
        <View style={styles.notConfigured}>
          <Text style={styles.notConfiguredText}>Sonarr not configured. Add it in Settings to manage your library.</Text>
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

          {/* Sonarr lookup results — ready to add directly */}
          {!searching && sonarrSearchResults.length > 0 && (
            <Carousel title="From Sonarr (ready to add)" count={sonarrSearchResults.length} status="loaded">
              {sonarrSearchResults.map((s, idx) => {
                const inLibrary = libraryTvdbIds.has(s.tvdbId);
                return (
                  <PosterCard key={`sonarr-${s.tvdbId}-${idx}`} title={s.title}
                    subtitle={`${s.year ?? ''} · ${s.network ?? ''}`}
                    posterUrl={s.images?.find(i => i.coverType === 'poster')?.remoteUrl}
                    badge={inLibrary ? { label: 'In Library', variant: 'inLibrary' } : undefined}
                    onPress={() => {
                      if (inLibrary) {
                        const existing = library.find(l => l.tvdbId === s.tvdbId);
                        if (existing) navigation.navigate('SeriesDetail', { series: existing });
                      } else {
                        navigation.navigate('DiscoveryDetail', { item: s, type: 'tv' });
                      }
                    }} />
                );
              })}
            </Carousel>
          )}

          {/* TMDB search results — broader discovery */}
          {!searching && tmdbSearchResults.length > 0 && (
            <Carousel title="From TMDB" count={tmdbSearchResults.length} status="loaded">
              {tmdbSearchResults.map((s, idx) => (
                <PosterCard key={`tmdb-${s.id}-${idx}`} title={s.name} subtitle={`${s.first_air_date?.slice(0, 4) ?? ''} · ★ ${s.vote_average?.toFixed(1) ?? ''}`}
                  posterUrl={posterUrl(s.poster_path)} rating={s.vote_average} size="md"
                  badge={getTmdbItemBadge(s)}
                  onPress={() => openTmdbShow(s)} />
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
          {displayLibrary.map((s) => (
            <PosterCard key={s.id} title={s.title} subtitle={`${s.network} · ${s.status === 'continuing' ? 'Airing' : 'Ended'}`}
              posterUrl={s.images?.find(i => i.coverType === 'poster')?.remoteUrl}
              badge={getSeriesBadge(s, queueMap)}
              progress={queueMap?.has(s.id) ? (queueMap.get(s.id)!.progress / 100) : undefined}
              onPress={() => navigation.navigate('SeriesDetail', { series: s })} />
          ))}
        </Carousel>
      )}

      {/* Discovery rows — hide when searching */}
      {!isSearchMode && (
        <>
          {tvWatchlist.length > 0 && (
            <Carousel title="My Watchlist" count={tvWatchlist.length} status="loaded">
              {tvWatchlist.map((w) => (
                <PosterCard key={w.tmdbId} title={w.title}
                  posterUrl={posterUrl(w.posterPath)} size="md"
                  badge={getBadge('tv', w.tmdbId)}
                  onPress={() => openTmdbShow({ id: w.tmdbId, name: w.title, poster_path: w.posterPath } as TMDBShow)} />
              ))}
            </Carousel>
          )}
          {!isTmdbConfigured() && (
            <View style={styles.notConfigured}>
              <Text style={styles.notConfiguredText}>Discovery is disabled — add a TMDB API token in Settings → Discovery.</Text>
            </View>
          )}
          <DiscoveryRows
            mediaType="tv"
            refreshToken={discoveryRefresh}
            onItemPress={(item) => openTmdbShow(item as TMDBShow)}
            getItemBadge={(item) => getTmdbItemBadge(item as TMDBShow)}
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
  syncBtn: { padding: spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  notConfigured: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: colors.divider },
  notConfiguredText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  searchingText: { ...typography.caption, color: colors.textMuted },
  noResults: { padding: spacing.xl, alignItems: 'center' },
  noResultsText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
