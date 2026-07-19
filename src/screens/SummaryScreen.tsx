import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, Linking } from 'react-native';
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
import { getAdapter, getSonarrAdapter, getRadarrAdapter, getEmbyAdapter, clearAdapters } from '../services/adapterFactory';
import { EmbyMediaItem } from '../services/emby/adapter';
import { Series } from '../services/sonarr/types';
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

  const [statuses, setStatuses] = useState<Partial<Record<ServiceId, boolean>>>({});
  const [resumeItems, setResumeItems] = useState<EmbyMediaItem[]>([]);
  const [nextUp, setNextUp] = useState<EmbyMediaItem[]>([]);
  const [readyEpisodes, setReadyEpisodes] = useState<any[]>([]);
  const [readyMovies, setReadyMovies] = useState<Movie[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showServerPicker, setShowServerPicker] = useState(false);

  const enabledServices = useMemo(() => server?.services.filter((s) => s.enabled) ?? [], [server]);
  const configOf = useCallback((id: ServiceId) => enabledServices.find((s) => s.serviceId === id), [enabledServices]);

  // Cumulative health — one light pass over every enabled service
  const fetchHealth = useCallback(async () => {
    if (!server) return;
    const results = await Promise.allSettled(enabledServices.map(async (svc) => {
      const status = await getAdapter(svc, isLocal).getStatus();
      return { id: svc.serviceId, up: status.connection.status === 'connected' };
    }));
    const next: Partial<Record<ServiceId, boolean>> = {};
    results.forEach((r) => { if (r.status === 'fulfilled') next[r.value.id] = r.value.up; });
    setStatuses(next);
  }, [server, enabledServices, isLocal]);

  usePolling(fetchHealth, 60000, !!server);

  const fetchContent = useCallback(async () => {
    if (!server) { setLoaded(true); return; }
    const sonarrConfig = configOf('sonarr');
    const radarrConfig = configOf('radarr');
    const embyConfig = configOf('emby');
    const now = new Date();

    await Promise.allSettled([
      (async () => {
        if (!embyConfig) return;
        const emby = getEmbyAdapter(embyConfig, isLocal);
        const [resume, next] = await Promise.all([
          emby.getResumeItems().catch(() => []),
          emby.getNextUp().catch(() => []),
        ]);
        setResumeItems(resume);
        setNextUp(next);
      })(),
      (async () => {
        if (!sonarrConfig) return;
        const sonarr = getSonarrAdapter(sonarrConfig, isLocal);
        const [past, upcoming] = await Promise.all([
          sonarr.getCalendar(new Date(now.getTime() - 7 * DAY).toISOString(), now.toISOString(), { includeSeries: true }),
          sonarr.getCalendar(now.toISOString(), new Date(now.getTime() + 14 * DAY).toISOString(), { includeSeries: true }),
        ]);
        setReadyEpisodes(past.filter((e: any) => e.hasFile));
        setSchedule((prev) => [
          ...prev.filter((e) => !e.key.startsWith('ep-')),
          ...upcoming.filter((e: any) => e.monitored).map((e: any) => ({
            key: `ep-${e.id}`,
            date: new Date(e.airDateUtc ?? now),
            title: e.series?.title ?? 'Unknown series',
            subtitle: `S${String(e.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}${e.title ? ` · ${e.title}` : ''}`,
            hasFile: e.hasFile,
            onPress: e.series ? () => navigation.navigate('TV', { screen: 'SeriesDetail', params: { series: e.series } }) : undefined,
          })),
        ]);
      })(),
      (async () => {
        if (!radarrConfig) return;
        const radarr = getRadarrAdapter(radarrConfig, isLocal);
        const [movies, upcoming] = await Promise.all([
          radarr.getMovies(),
          radarr.getCalendar(now.toISOString(), new Date(now.getTime() + 30 * DAY).toISOString()),
        ]);
        const cutoff = now.getTime() - 14 * DAY;
        setReadyMovies(movies
          .filter((m) => m.hasFile && m.movieFile?.dateAdded && new Date(m.movieFile.dateAdded).getTime() > cutoff)
          .sort((a, b) => new Date(b.movieFile!.dateAdded!).getTime() - new Date(a.movieFile!.dateAdded!).getTime())
          .slice(0, 12));
        const byId = new Map(movies.map((m) => [m.id, m]));
        setSchedule((prev) => [
          ...prev.filter((e) => !e.key.startsWith('mv-')),
          ...upcoming.filter((m: any) => m.monitored && !m.hasFile).map((m: any) => ({
            key: `mv-${m.id}`,
            date: new Date(m.digitalRelease ?? m.inCinemas ?? now),
            title: m.title,
            subtitle: m.digitalRelease ? 'Digital release' : 'In cinemas',
            hasFile: false,
            onPress: byId.has(m.id)
              ? () => navigation.navigate('Movies', { screen: 'MovieDetail', params: { movie: byId.get(m.id) } })
              : undefined,
          })),
        ]);
      })(),
    ]);
    setLoaded(true);
  }, [server, configOf, isLocal, navigation]);

  usePolling(fetchContent, 300000, !!server);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchContent(), fetchHealth()]);
    setRefreshing(false);
  }, [fetchContent, fetchHealth]);

  const openEmbyItem = async (item: EmbyMediaItem) => {
    const embyConfig = configOf('emby');
    if (!embyConfig) return;
    const emby = getEmbyAdapter(embyConfig, isLocal);
    try {
      await Linking.openURL(`emby://items/${item.ServerId}/${item.Id}`);
    } catch {
      await Linking.openURL(`${emby.baseUrl}/web/index.html#!/item?id=${item.Id}&serverId=${item.ServerId}`).catch(() => {});
    }
  };

  const embyAdapter = useMemo(() => {
    const cfg = configOf('emby');
    return cfg ? getEmbyAdapter(cfg, isLocal) : null;
  }, [configOf, isLocal]);

  // Health summary
  const upCount = Object.values(statuses).filter(Boolean).length;
  const downServices = Object.entries(statuses).filter(([, up]) => !up).map(([id]) => serviceConfig[id as ServiceId]?.label ?? id);
  const totalChecked = Object.keys(statuses).length;
  const allUp = totalChecked > 0 && downServices.length === 0;

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

  const episodeLabel = (item: EmbyMediaItem) =>
    item.Type === 'Episode' && item.ParentIndexNumber != null && item.IndexNumber != null
      ? `S${String(item.ParentIndexNumber).padStart(2, '0')}E${String(item.IndexNumber).padStart(2, '0')}`
      : item.ProductionYear ? String(item.ProductionYear) : undefined;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Pressable style={styles.serverPill} onPress={() => setShowServerPicker(true)}>
            <MaterialCommunityIcons name="server" size={14} color={colors.primary} />
            <Text style={styles.serverPillText}>{server?.name ?? 'No server'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.statusPill, allUp ? styles.statusPillOk : totalChecked > 0 ? styles.statusPillBad : null]}
            onPress={() => navigation.navigate('Dashboard')}
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

        {(readyEpisodes.length > 0 || readyMovies.length > 0) && (
          <Carousel title="New & Ready to Watch" status="loaded">
            {readyEpisodes.map((e: any) => (
              <PosterCard
                key={`ep-${e.id}`}
                title={e.series?.title ?? e.title}
                subtitle={`S${String(e.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}`}
                posterUrl={e.series?.images?.find((i: any) => i.coverType === 'poster')?.remoteUrl}
                badge={{ label: 'New', variant: 'inLibrary' }}
                size="md"
                onPress={() => e.series && navigation.navigate('TV', { screen: 'SeriesDetail', params: { series: e.series } })}
              />
            ))}
            {readyMovies.map((m) => (
              <PosterCard
                key={`mv-${m.id}`}
                title={m.title}
                subtitle={String(m.year)}
                posterUrl={m.images?.find((i) => i.coverType === 'poster')?.remoteUrl}
                badge={{ label: 'New', variant: 'inLibrary' }}
                size="md"
                onPress={() => navigation.navigate('Movies', { screen: 'MovieDetail', params: { movie: m } })}
              />
            ))}
          </Carousel>
        )}

        <Text style={styles.scheduleTitle}>Coming Up</Text>
        {groupedSchedule.length === 0 && loaded && (
          <Text style={styles.scheduleEmpty}>Nothing scheduled in the next two weeks.</Text>
        )}
        {groupedSchedule.map((group) => (
          <View key={group.label}>
            <Text style={styles.dayLabel}>{group.label}</Text>
            {group.entries.map((entry) => (
              <Pressable key={entry.key} style={styles.scheduleRow} onPress={entry.onPress} disabled={!entry.onPress}>
                <View style={[styles.scheduleDot, { backgroundColor: entry.hasFile ? colors.success : colors.info }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleItemTitle} numberOfLines={1}>{entry.title}</Text>
                  <Text style={styles.scheduleItemSub} numberOfLines={1}>{entry.subtitle}</Text>
                </View>
                <Text style={styles.scheduleTime}>
                  {entry.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
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
  container: { flex: 1, backgroundColor: colors.surfaceBase },
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
  scheduleTitle: { ...typography.h3, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.sm },
  scheduleEmpty: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.xl },
  dayLabel: { ...typography.micro, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.xs },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.xs, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleItemTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
  scheduleItemSub: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  scheduleTime: { ...typography.micro, color: colors.textMuted },
});
