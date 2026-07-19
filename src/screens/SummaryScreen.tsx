import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography, ServiceId, serviceConfig } from '../core/theme/tokens';
import { Carousel } from '../core/components/Carousel';
import { PosterCard } from '../core/components/PosterCard';
import { ActionSheet, ActionSheetOption } from '../core/components/ActionSheet';
import { usePolling } from '../core/hooks/usePolling';
import { useServerStore } from '../stores/serverStore';
import { useConnectionStore } from '../stores/connectionStore';
import { getSonarrAdapter, getRadarrAdapter, getEmbyAdapter, clearAdapters } from '../services/adapterFactory';
import { useStatusStore } from '../stores/statusStore';
import { useLibraryStore } from '../stores/libraryStore';
import { openEmbyRef } from '../services/emby/openInEmby';
import { EmbyMediaItem } from '../services/emby/adapter';
import { Movie } from '../services/radarr/types';

const DAY = 86400000;

interface ScheduleEntry {
  key: string;
  date: Date;
  title: string;
  subtitle: string;
  hasFile: boolean;
  onPress?: () => void;
}

function mergeSchedule(prev: ScheduleEntry[], prefix: string, entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...prev.filter((e) => !e.key.startsWith(prefix)), ...entries];
}

function dayLabel(date: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return target.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const servers = useServerStore((s) => s.servers);
  const server = useServerStore((s) => s.getActiveServer());
  const setActiveServer = useServerStore((s) => s.setActiveServer);
  const isLocal = useConnectionStore((s) => s.isLocal);

  const serviceStatuses = useStatusStore((s) => s.statuses);
  const refreshStatuses = useStatusStore((s) => s.refresh);
  const [resumeItems, setResumeItems] = useState<EmbyMediaItem[]>([]);
  const [latestShows, setLatestShows] = useState<EmbyMediaItem[]>([]);
  const [latestMovies, setLatestMovies] = useState<EmbyMediaItem[]>([]);
  const [nextUp, setNextUp] = useState<EmbyMediaItem[]>([]);
  const [playedEpisodeKeys, setPlayedEpisodeKeys] = useState<Set<string>>(new Set());
  const [playedMovieTmdbIds, setPlayedMovieTmdbIds] = useState<Set<number>>(new Set());
  const [readyEpisodes, setReadyEpisodes] = useState<any[]>([]);
  const [readyMovies, setReadyMovies] = useState<Movie[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // While a drag is actively scrolling the schedule card, the page stays put;
  // releasing and dragging again at the card's edge scrolls the page instead
  const [pageScrollEnabled, setPageScrollEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [showServerPicker, setShowServerPicker] = useState(false);

  const enabledServices = useMemo(() => server?.services.filter((s) => s.enabled) ?? [], [server]);
  const configOf = useCallback((id: ServiceId) => enabledServices.find((s) => s.serviceId === id), [enabledServices]);

  // Cumulative health — shared TTL'd store, coalesced with the Dashboard's poll
  const fetchHealth = useCallback(async () => {
    if (!server) return;
    await refreshStatuses(enabledServices, isLocal);
  }, [server, enabledServices, isLocal, refreshStatuses]);

  usePolling(fetchHealth, 60000, !!server);

  const fetchSeq = React.useRef(0);
  const lastContent = React.useRef<{ at: number; serverId?: string }>({ at: 0 });

  const fetchContent = useCallback(async (force = false) => {
    if (!server) { setLoaded(true); return; }
    // Refocusing the tab re-fires the poll immediately; skip if fresh enough
    if (!force && lastContent.current.serverId === server.id
        && Date.now() - lastContent.current.at < 5 * 60 * 1000) return;
    // Any newer run (server switch) invalidates this one's writes
    const seq = ++fetchSeq.current;
    const stale = () => seq !== fetchSeq.current;
    const sonarrConfig = configOf('sonarr');
    const radarrConfig = configOf('radarr');
    const embyConfig = configOf('emby');
    const now = new Date();

    // Clear sections owned by services the active server doesn't have,
    // so switching servers never shows the previous server's data
    if (!embyConfig) {
      setResumeItems([]); setNextUp([]);
      setLatestShows([]); setLatestMovies([]);
      setPlayedEpisodeKeys(new Set()); setPlayedMovieTmdbIds(new Set());
    }
    if (!sonarrConfig) {
      setReadyEpisodes([]);
      setSchedule((prev) => prev.filter((e) => !e.key.startsWith('ep-')));
    }
    if (!radarrConfig) {
      setReadyMovies([]);
      setSchedule((prev) => prev.filter((e) => !e.key.startsWith('mv-')));
    }

    await Promise.allSettled([
      (async () => {
        if (!embyConfig) return;
        const emby = getEmbyAdapter(embyConfig, isLocal);
        const [resume, next, freshShows, freshMovies, played] = await Promise.all([
          emby.getResumeItems().catch(() => []),
          emby.getNextUp().catch(() => []),
          emby.getLatestUnplayed('Episode').catch(() => []),
          emby.getLatestUnplayed('Movie').catch(() => []),
          emby.getRecentlyPlayed(100).catch(() => []),
        ]);
        if (stale()) return;
        setResumeItems(resume);
        setNextUp(next);
        setLatestShows(freshShows);
        setLatestMovies(freshMovies);
        // Watched-state cross-reference: episodes keyed by series|season|episode, movies by tmdb id
        const epKeys = new Set<string>();
        const movieIds = new Set<number>();
        for (const item of played) {
          if (item.Type === 'Episode') {
            // tvdb episode id is exact; title|season|episode covers items without one
            const tvdbId = item.ProviderIds?.Tvdb;
            if (tvdbId) epKeys.add(`tvdb:${tvdbId}`);
            if (item.SeriesName != null && item.ParentIndexNumber != null && item.IndexNumber != null) {
              epKeys.add(`${item.SeriesName.toLowerCase()}|${item.ParentIndexNumber}|${item.IndexNumber}`);
            }
          } else if (item.Type === 'Movie') {
            const tmdbId = parseInt(item.ProviderIds?.Tmdb ?? '', 10);
            if (Number.isFinite(tmdbId)) movieIds.add(tmdbId);
          }
        }
        setPlayedEpisodeKeys(epKeys);
        setPlayedMovieTmdbIds(movieIds);
      })(),
      (async () => {
        if (!sonarrConfig) return;
        const sonarr = getSonarrAdapter(sonarrConfig, isLocal);
        const [past, upcoming] = await Promise.all([
          sonarr.getCalendar(new Date(now.getTime() - 7 * DAY).toISOString(), now.toISOString(), { includeSeries: true }),
          sonarr.getCalendar(now.toISOString(), new Date(now.getTime() + 14 * DAY).toISOString(), { includeSeries: true }),
        ]);
        if (stale()) return;
        setReadyEpisodes(past.filter((e: any) => e.hasFile));
        setSchedule((prev) => mergeSchedule(prev, 'ep-', upcoming.filter((e: any) => e.monitored).map((e: any) => ({
            key: `ep-${e.id}`,
            date: new Date(e.airDateUtc ?? now),
            title: e.series?.title ?? 'Unknown series',
            subtitle: `S${String(e.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}${e.title ? ` · ${e.title}` : ''}`,
            hasFile: e.hasFile,
            onPress: e.series ? () => navigation.navigate('TV', { screen: 'SeriesDetail', params: { series: e.series }, initial: false }) : undefined,
          }))));
      })(),
      (async () => {
        if (!radarrConfig) return;
        const radarr = getRadarrAdapter(radarrConfig, isLocal);
        const [movies, upcoming] = await Promise.all([
          radarr.getMovies(),
          radarr.getCalendar(now.toISOString(), new Date(now.getTime() + 30 * DAY).toISOString()),
        ]);
        if (stale()) return;
        useLibraryStore.getState().setMovies(movies);
        const cutoff = now.getTime() - 14 * DAY;
        setReadyMovies(movies
          .filter((m) => m.hasFile && m.movieFile?.dateAdded && new Date(m.movieFile.dateAdded).getTime() > cutoff)
          .sort((a, b) => new Date(b.movieFile!.dateAdded!).getTime() - new Date(a.movieFile!.dateAdded!).getTime())
          .slice(0, 12));
        const byId = new Map(movies.map((m) => [m.id, m]));
        setSchedule((prev) => mergeSchedule(prev, 'mv-', upcoming.filter((m: any) => m.monitored && !m.hasFile).map((m: any) => ({
            key: `mv-${m.id}`,
            date: new Date(m.digitalRelease ?? m.inCinemas ?? now),
            title: m.title,
            subtitle: m.digitalRelease ? 'Digital release' : 'In cinemas',
            hasFile: false,
            onPress: byId.has(m.id)
              ? () => navigation.navigate('Movies', { screen: 'MovieDetail', params: { movie: byId.get(m.id) }, initial: false })
              : undefined,
          }))));
      })(),
    ]);
    if (!stale()) {
      lastContent.current = { at: Date.now(), serverId: server.id };
      setLoaded(true);
    }
  }, [server, configOf, isLocal, navigation]);

  usePolling(fetchContent, 900000, !!server);

  // Immediate reload when the active server changes — don't wait out the timer.
  // Skips the mount run since usePolling already fetches immediately.
  const prevServerId = React.useRef(server?.id);
  React.useEffect(() => {
    if (server && prevServerId.current !== server.id) {
      fetchContent();
      refreshStatuses(enabledServices, isLocal, true);
    }
    prevServerId.current = server?.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchContent(true), refreshStatuses(enabledServices, isLocal, true)]);
    setRefreshing(false);
  }, [fetchContent, fetchHealth]);

  const openEmbyItem = (item: EmbyMediaItem) => {
    if (embyAdapter) openEmbyRef(embyAdapter, item).catch(() => {});
  };

  const embyAdapter = useMemo(() => {
    const cfg = configOf('emby');
    return cfg ? getEmbyAdapter(cfg, isLocal) : null;
  }, [configOf, isLocal]);

  // Hide items the user already watched in Emby (no-op when Emby is unavailable)
  const unwatchedEpisodes = useMemo(() => readyEpisodes.filter((e: any) =>
    !(e.tvdbId && playedEpisodeKeys.has(`tvdb:${e.tvdbId}`)) &&
    !playedEpisodeKeys.has(`${(e.series?.title ?? '').toLowerCase()}|${e.seasonNumber}|${e.episodeNumber}`)),
  [readyEpisodes, playedEpisodeKeys]);

  const unwatchedMovies = useMemo(() => readyMovies.filter((m) =>
    !playedMovieTmdbIds.has(m.tmdbId)),
  [readyMovies, playedMovieTmdbIds]);

  // Health summary from the shared store
  const upCount = Object.values(serviceStatuses).filter((st) => st?.connection.status === 'connected').length;
  const downServices = Object.entries(serviceStatuses)
    .filter(([, st]) => st?.connection.status !== 'connected')
    .map(([id]) => serviceConfig[id as ServiceId]?.label ?? id);
  const totalChecked = Object.keys(serviceStatuses).length;
  const allUp = totalChecked > 0 && downServices.length === 0;

  // If the schedule card disappears mid-drag its end callbacks never fire —
  // never leave the page lock stuck
  React.useEffect(() => {
    if (schedule.length === 0) setPageScrollEnabled(true);
  }, [schedule.length]);

  // Schedule grouped by day
  const groupedSchedule = useMemo(() => {
    const sorted = [...schedule].sort((a, b) => a.date.getTime() - b.date.getTime());
    const groups: Array<{ label: string; entries: ScheduleEntry[] }> = [];
    for (const entry of sorted) {
      const label = dayLabel(entry.date);
      const group = groups[groups.length - 1];
      if (group && group.label === label) group.entries.push(entry);
      else groups.push({ label, entries: [entry] });
    }
    return groups;
  }, [schedule]);

  const serverOptions: ActionSheetOption[] = [
    ...servers.map((srv) => ({
      label: srv.id === server?.id ? `✓ ${srv.name}` : srv.name,
      icon: '🖥',
      onPress: () => {
        if (srv.id !== server?.id) { setActiveServer(srv.id); clearAdapters(); }
      },
    })),
    { label: 'Manage Servers', icon: '⚙️', onPress: () => navigation.navigate('Settings') },
  ];

  const latestLabel = (item: EmbyMediaItem) => {
    const unplayed = item.UserData?.UnplayedItemCount;
    if (item.Type === 'Series' && unplayed) return `${unplayed} new episode${unplayed > 1 ? 's' : ''}`;
    return episodeLabel(item);
  };

  const episodeLabel = (item: EmbyMediaItem) =>
    item.Type === 'Episode' && item.ParentIndexNumber != null && item.IndexNumber != null
      ? `S${String(item.ParentIndexNumber).padStart(2, '0')}E${String(item.IndexNumber).padStart(2, '0')}`
      : item.ProductionYear ? String(item.ProductionYear) : undefined;

  return (
    <View style={styles.container}>
      <ScrollView
        scrollEnabled={pageScrollEnabled}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Pressable style={styles.serverPill} onPress={() => setShowServerPicker(true)} accessibilityRole="button" accessibilityLabel={`Switch server, current ${server?.name ?? 'none'}`}>
            <MaterialCommunityIcons name="server" size={14} color={colors.primary} />
            <Text style={styles.serverPillText}>{server?.name ?? 'No server'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.statusPill, allUp ? styles.statusPillOk : totalChecked > 0 ? styles.statusPillBad : null]}
            onPress={() => navigation.navigate('Dashboard')}
            accessibilityRole="button"
            accessibilityLabel={totalChecked === 0 ? 'Service status, checking' : allUp ? `All ${upCount} services up, open dashboard` : `${downServices.length} services down, open dashboard`}
          >
            <View style={[styles.statusDot, { backgroundColor: totalChecked === 0 ? colors.textMuted : allUp ? colors.success : colors.error }]} />
            <Text style={[styles.statusPillText, { color: totalChecked === 0 ? colors.textMuted : allUp ? colors.success : colors.error }]}>
              {totalChecked === 0 ? 'Checking...' : allUp ? `All ${upCount} services up` : `${downServices.length} down`}
            </Text>
          </Pressable>
        </View>

        {!server && (
          <View style={styles.emptyServer}>
            <Text style={styles.emptyServerText}>No server configured yet.</Text>
            <Pressable style={styles.setupBtn} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.setupBtnText}>Set Up Server</Text>
            </Pressable>
          </View>
        )}

        {server && !configOf('emby') && (
          <View style={styles.serviceNote}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.serviceNoteText}>Emby not connected — Continue Watching and watched-state filtering unavailable.</Text>
          </View>
        )}

        {server && !configOf('sonarr') && !configOf('radarr') && (
          <View style={styles.serviceNote}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.serviceNoteText}>Sonarr/Radarr not connected — new releases and schedule unavailable.</Text>
          </View>
        )}

        {resumeItems.length > 0 && embyAdapter && (
          <Carousel title="Continue Watching" status="loaded">
            {resumeItems.map((item) => (
              <PosterCard
                key={item.Id}
                title={item.Type === 'Episode' ? item.SeriesName ?? item.Name : item.Name}
                subtitle={episodeLabel(item)}
                posterUrl={embyAdapter.posterUrl(item)}
                progress={(item.UserData?.PlayedPercentage ?? 0) / 100}
                size="md"
                onPress={() => openEmbyItem(item)}
              />
            ))}
          </Carousel>
        )}

        {nextUp.length > 0 && embyAdapter && (
          <Carousel title="Next Up" status="loaded">
            {nextUp.map((item) => (
              <PosterCard
                key={item.Id}
                title={item.SeriesName ?? item.Name}
                subtitle={episodeLabel(item)}
                posterUrl={embyAdapter.posterUrl(item)}
                size="md"
                onPress={() => openEmbyItem(item)}
              />
            ))}
          </Carousel>
        )}

        {latestShows.length > 0 && embyAdapter && (
          <Carousel title="Latest TV Shows" accent={colors.sonarr} status="loaded">
            {latestShows.map((item) => (
              <PosterCard
                key={item.Id}
                title={item.Type === 'Episode' ? item.SeriesName ?? item.Name : item.Name}
                subtitle={latestLabel(item)}
                posterUrl={embyAdapter.posterUrl(item)}
                badge={{ label: 'New', variant: 'inLibrary' }}
                size="md"
                onPress={() => openEmbyItem(item)}
              />
            ))}
          </Carousel>
        )}

        {latestMovies.length > 0 && embyAdapter && (
          <Carousel title="Latest Movies" accent={colors.radarr} status="loaded">
            {latestMovies.map((item) => (
              <PosterCard
                key={item.Id}
                title={item.Name}
                subtitle={item.ProductionYear ? String(item.ProductionYear) : undefined}
                posterUrl={embyAdapter.posterUrl(item)}
                badge={{ label: 'New', variant: 'inLibrary' }}
                size="md"
                onPress={() => openEmbyItem(item)}
              />
            ))}
          </Carousel>
        )}

        {latestShows.length === 0 && latestMovies.length === 0 && (unwatchedEpisodes.length > 0 || unwatchedMovies.length > 0) && (
          <Carousel title="New & Ready to Watch" status="loaded">
            {unwatchedEpisodes.map((e: any) => (
              <PosterCard
                key={`ep-${e.id}`}
                title={e.series?.title ?? e.title}
                subtitle={`S${String(e.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}`}
                posterUrl={e.series?.images?.find((i: any) => i.coverType === 'poster')?.remoteUrl}
                badge={{ label: 'New', variant: 'inLibrary' }}
                size="md"
                onPress={() => e.series && navigation.navigate('TV', { screen: 'SeriesDetail', params: { series: e.series }, initial: false })}
              />
            ))}
            {unwatchedMovies.map((m) => (
              <PosterCard
                key={`mv-${m.id}`}
                title={m.title}
                subtitle={String(m.year)}
                posterUrl={m.images?.find((i) => i.coverType === 'poster')?.remoteUrl}
                badge={{ label: 'New', variant: 'inLibrary' }}
                size="md"
                onPress={() => navigation.navigate('Movies', { screen: 'MovieDetail', params: { movie: m }, initial: false })}
              />
            ))}
          </Carousel>
        )}

        {(configOf('sonarr') || configOf('radarr')) && (
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleAccent} />
            <Text style={styles.scheduleTitle}>Coming Up</Text>
          </View>
        )}
        {(configOf('sonarr') || configOf('radarr')) && groupedSchedule.length === 0 && loaded && (
          <Text style={styles.scheduleEmpty}>Nothing scheduled in the next two weeks.</Text>
        )}
        {groupedSchedule.length > 0 && (
          <View style={styles.scheduleCard}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={styles.scheduleScrollContent}
              onScrollBeginDrag={() => setPageScrollEnabled(false)}
              onScrollEndDrag={() => setPageScrollEnabled(true)}
              onMomentumScrollEnd={() => setPageScrollEnabled(true)}
            >
              {groupedSchedule.map((group) => (
                <View key={group.label}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{group.label}</Text>
                    <View style={styles.dayLine} />
                  </View>
                  {group.entries.map((entry) => (
                    <Pressable
                      key={entry.key}
                      style={({ pressed }) => [styles.scheduleRow, pressed && entry.onPress ? { opacity: 0.6 } : null]}
                      onPress={entry.onPress} disabled={!entry.onPress}
                    >
                      <Text style={styles.scheduleTime}>
                        {entry.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View style={[styles.scheduleDot, { backgroundColor: entry.hasFile ? colors.success : colors.info }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleItemTitle} numberOfLines={1}>{entry.title}</Text>
                        <Text style={styles.scheduleItemSub} numberOfLines={1}>{entry.subtitle}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <ActionSheet
        visible={showServerPicker}
        title="Server"
        subtitle={server ? `Active: ${server.name} · ${isLocal ? 'Local' : 'Remote'}` : undefined}
        options={serverOptions}
        onClose={() => setShowServerPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
  serverPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round },
  serverPillText: { ...typography.bodyBold, color: colors.primary },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round, borderWidth: 1, borderColor: colors.divider },
  statusPillOk: { backgroundColor: 'rgba(100, 255, 218, 0.08)', borderColor: 'rgba(100, 255, 218, 0.2)' },
  statusPillBad: { backgroundColor: 'rgba(233, 69, 96, 0.08)', borderColor: 'rgba(233, 69, 96, 0.25)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { ...typography.micro, fontWeight: '600' },
  emptyServer: { alignItems: 'center', padding: spacing.xxxl },
  emptyServerText: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  setupBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: radii.md, backgroundColor: colors.primary },
  setupBtnText: { ...typography.bodyBold, color: '#0f1023' },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.sm },
  scheduleAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  scheduleTitle: { ...typography.h3, color: colors.textPrimary },
  scheduleEmpty: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.xl },
  // Agenda card: fixed height, scrolls internally so the page stays short
  scheduleCard: { marginHorizontal: spacing.xl, maxHeight: 340, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.xl, overflow: 'hidden' },
  scheduleScrollContent: { padding: spacing.lg, paddingTop: spacing.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.xs },
  dayLabel: { ...typography.micro, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleItemTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
  scheduleItemSub: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  scheduleTime: { ...typography.micro, color: colors.textMuted, width: 42, fontVariant: ['tabular-nums'] },
  serviceNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: spacing.md, backgroundColor: '#181c3c', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.md },
  serviceNoteText: { ...typography.micro, color: colors.textMuted, flex: 1 },
});
