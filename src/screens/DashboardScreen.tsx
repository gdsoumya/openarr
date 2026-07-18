import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, ServiceId } from '../core/theme/tokens';
import { ServiceCard } from '../core/components/ServiceCard';
import { SpeedBanner } from '../core/components/SpeedBanner';
import { useServerStore } from '../stores/serverStore';
import { useConnectionStore } from '../stores/connectionStore';
import { ServiceStatus } from '../core/types/services';
import { getAdapter, getTransmissionAdapter } from '../services/adapterFactory';
import { usePolling } from '../core/hooks/usePolling';
import { useToastStore } from '../core/hooks/useToast';
import { formatBytes, formatSpeed } from '../core/utils/format';

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
    portainer: 'Infra', gluetun: 'Infra',
  };
  const erroredServicesRef = useRef<Set<string>>(new Set());
  const showToast = useToastStore((s) => s.show);

  const fetchStatuses = useCallback(async () => {
    if (!server) return;
    const newStatuses: Partial<Record<ServiceId, ServiceStatus>> = {};

    const results = await Promise.allSettled(
      enabledServices.map(async (svc) => {
        const config = server.services.find(s => s.serviceId === svc.serviceId);
        if (!config) return;
        const status = await getAdapter(config, isLocal).getStatus();
        return { serviceId: svc.serviceId, status };
      })
    );

    results.forEach((result, index) => {
      const svc = enabledServices[index];
      if (result.status === 'fulfilled' && result.value) {
        newStatuses[result.value.serviceId] = result.value.status;
        erroredServicesRef.current.delete(svc.serviceId);
      } else if (result.status === 'rejected') {
        if (!erroredServicesRef.current.has(svc.serviceId)) {
          erroredServicesRef.current.add(svc.serviceId);
          showToast(`${svc.serviceId}: ${result.reason?.message ?? 'Connection failed'}`, 'error');
        }
      }
    });

    setStatuses(newStatuses);

    // Transmission speed/free-space banner (download notifications live in useDownloadMonitor)
    const txConfig = server.services.find(s => s.serviceId === 'transmission' && s.enabled);
    if (txConfig) {
      try {
        const tx = getTransmissionAdapter(txConfig, isLocal);
        const [stats, session] = await Promise.all([tx.getSessionStats(), tx.getSession()]);
        setDownloadSpeed(stats.downloadSpeed);
        setUploadSpeed(stats.uploadSpeed);
        setFreeSpace(await tx.getFreeSpace(session.downloadDir));
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
        <Pressable style={styles.setupButton} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.setupButtonText}>Set Up Server</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.headerBtn} hitSlop={8} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <Pressable style={styles.headerBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
        </Pressable>
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
            onPress={() => {
              if (svc.serviceId === 'emby') { Linking.openURL(isLocal ? svc.localUrl : svc.remoteUrl); return; }
              const tab = tabMap[svc.serviceId];
              if (tab) navigation.navigate('Main', { screen: tab });
            }} />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  headerBtn: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
