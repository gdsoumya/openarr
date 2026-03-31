import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, ServiceId } from '../core/theme/tokens';
import { ServiceCard } from '../core/components/ServiceCard';
import { SpeedBanner } from '../core/components/SpeedBanner';
import { useServerStore } from '../stores/serverStore';
import { useConnectionStore } from '../stores/connectionStore';
import { ServiceStatus } from '../core/types/services';
import { getTransmissionAdapter, getSonarrAdapter, getRadarrAdapter, getProwlarrAdapter, getBazarrAdapter } from '../services/adapterFactory';
import { usePolling } from '../core/hooks/usePolling';
import { checkForCompletedDownloads } from '../core/notifications/downloadMonitor';
import { useToastStore } from '../core/hooks/useToast';

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1048576) return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${bytesPerSec} B/s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1099511627776) return `${(bytes / 1099511627776).toFixed(0)} TB`;
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const server = useServerStore((s) => s.getActiveServer());
  const isLocal = useConnectionStore((s) => s.isLocal);
  const [statuses, setStatuses] = useState<Partial<Record<ServiceId, ServiceStatus>>>({});
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [freeSpace, setFreeSpace] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const enabledServices = useMemo(() => server?.services.filter((s) => s.enabled) ?? [], [server]);
  const tabMap: Partial<Record<ServiceId, string>> = {
    transmission: 'Torrents', sonarr: 'TV', radarr: 'Movies', prowlarr: 'Search', bazarr: 'Subs',
  };
  const previousQueueRef = useRef<Array<{ id: number; title: string }>>([]);
  const showToast = useToastStore((s) => s.show);

  const fetchStatuses = useCallback(async () => {
    if (!server) return;
    const newStatuses: Partial<Record<ServiceId, ServiceStatus>> = {};

    for (const svc of enabledServices) {
      try {
        const config = server.services.find(s => s.serviceId === svc.serviceId);
        if (!config) continue;
        let adapter: any;
        switch (svc.serviceId) {
          case 'transmission': adapter = getTransmissionAdapter(config, isLocal); break;
          case 'sonarr': adapter = getSonarrAdapter(config, isLocal); break;
          case 'radarr': adapter = getRadarrAdapter(config, isLocal); break;
          case 'prowlarr': adapter = getProwlarrAdapter(config, isLocal); break;
          case 'bazarr': adapter = getBazarrAdapter(config, isLocal); break;
        }
        if (adapter) newStatuses[svc.serviceId] = await adapter.getStatus();
      } catch (e: any) {
        showToast(`${svc.serviceId}: ${e.message ?? 'Connection failed'}`, 'error');
      }
    }
    setStatuses(newStatuses);

    // Transmission speed data + queue comparison for download notifications
    const txConfig = server.services.find(s => s.serviceId === 'transmission' && s.enabled);
    if (txConfig) {
      try {
        const tx = getTransmissionAdapter(txConfig, isLocal);
        const stats = await tx.getSessionStats();
        setDownloadSpeed(stats.downloadSpeed);
        setUploadSpeed(stats.uploadSpeed);
        const session = await tx.getSession();
        const free = await tx.getFreeSpace(session.downloadDir);
        setFreeSpace(free);
      } catch {}
    }

    // Sonarr queue for download completion notifications
    const sonarrConfig = server.services.find(s => s.serviceId === 'sonarr' && s.enabled);
    if (sonarrConfig) {
      try {
        const sonarr = getSonarrAdapter(sonarrConfig, isLocal);
        const queueData = await sonarr.getQueue(1, 50);
        const currentQueue = (queueData.records ?? []).map((q: any) => ({ id: q.id, title: q.title }));
        checkForCompletedDownloads(currentQueue, previousQueueRef.current);
        previousQueueRef.current = currentQueue;
      } catch {}
    }
  }, [server, enabledServices, isLocal]);

  usePolling(fetchStatuses, 10000, !!server);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatuses();
    setRefreshing(false);
  }, [fetchStatuses]);

  if (!server) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyIcon}>🔧</Text>
        <Text style={styles.emptyTitle}>No Server Configured</Text>
        <Text style={styles.emptyText}>Add a server in Settings to get started.</Text>
        <Pressable style={styles.setupButton} onPress={() => navigation.navigate('Home', { screen: 'Settings' })}>
          <Text style={styles.setupButtonText}>Set Up Server</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerBtn}><Text style={{ fontSize: 16 }}>🔔</Text></Pressable>
          <Pressable style={styles.headerBtn} onPress={() => navigation.navigate('Home', { screen: 'Settings' })}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.serverPill}>
        <View style={styles.serverDot} />
        <Text style={styles.serverText}>{server.name} · {isLocal ? 'Local' : 'Remote'}</Text>
      </View>
      <SpeedBanner downloadSpeed={formatSpeed(downloadSpeed)} uploadSpeed={formatSpeed(uploadSpeed)}
        thirdStat={{ value: freeSpace > 0 ? formatBytes(freeSpace) : '—', label: 'Free Space' }} />
      {enabledServices.map((svc) => {
        const status = statuses[svc.serviceId];
        return (
          <ServiceCard key={svc.serviceId} serviceId={svc.serviceId}
            summary={status?.summary ?? 'Connecting...'}
            connected={status?.connection.status === 'connected'}
            metric={status?.metric}
            onPress={() => { const tab = tabMap[svc.serviceId]; if (tab) navigation.navigate(tab); }} />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerBtn: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  serverPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: 'rgba(100, 255, 218, 0.08)', borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.15)', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  serverDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  serverText: { ...typography.micro, color: colors.primary, fontWeight: '500' },
  empty: { flex: 1, backgroundColor: colors.surfaceBase, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  setupButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary },
  setupButtonText: { ...typography.bodyBold, color: '#0f1023' },
});
