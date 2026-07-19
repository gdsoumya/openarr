import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, ServiceId } from '../core/theme/tokens';
import { ServiceCard } from '../core/components/ServiceCard';
import { useServerStore } from '../stores/serverStore';
import { useConnectionStore } from '../stores/connectionStore';
import { getTransmissionAdapter } from '../services/adapterFactory';
import { useStatusStore } from '../stores/statusStore';
import { usePolling } from '../core/hooks/usePolling';
import { useToastStore } from '../core/hooks/useToast';
import { formatBytes, formatSpeed } from '../core/utils/format';

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const server = useServerStore((s) => s.getActiveServer());
  const isLocal = useConnectionStore((s) => s.isLocal);
  const statuses = useStatusStore((s) => s.statuses);
  const refreshStatuses = useStatusStore((s) => s.refresh);
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

  const fetchStatuses = useCallback(async (force = false) => {
    if (!server) return;
    await refreshStatuses(enabledServices, isLocal, force);

    // Toast newly-failing services once until they recover
    const current = useStatusStore.getState().statuses;
    for (const svc of enabledServices) {
      const st = current[svc.serviceId];
      if (st && st.connection.status !== 'connected') {
        if (!erroredServicesRef.current.has(svc.serviceId)) {
          erroredServicesRef.current.add(svc.serviceId);
          showToast(`${svc.serviceId}: ${st.connection.error ?? 'Connection failed'}`, 'error');
        }
      } else {
        erroredServicesRef.current.delete(svc.serviceId);
      }
    }

    // Transmission speed/free-space banner (download notifications live in useDownloadMonitor)
    const txConfig = server.services.find(s => s.serviceId === 'transmission' && s.enabled);
    if (txConfig) {
      try {
        const tx = getTransmissionAdapter(txConfig, isLocal);
        const [stats, session] = await Promise.all([tx.getSessionStats(), tx.getSession()]);
        setDownloadSpeed(stats.downloadSpeed);
        setUploadSpeed(stats.uploadSpeed);
        setFreeSpace(await tx.getFreeSpace(session.downloadDir));
      } catch {
        // Stale numbers are worse than zeros when transmission drops
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setFreeSpace(0);
      }
    }
  }, [server, enabledServices, isLocal, refreshStatuses, showToast]);

  usePolling(fetchStatuses, 30000, !!server);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatuses(true);
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
      <Pressable style={styles.serverCard} onPress={() => navigation.navigate('Settings')}>
        <View style={styles.serverIcon}>
          <Ionicons name="server-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.serverName}>{server.name}</Text>
          <Text style={styles.serverMeta}>
            {isLocal ? 'Local network' : 'Remote access'} · {enabledServices.length} services enabled
          </Text>
        </View>
        <View style={styles.serverChangeBtn}>
          <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
          <Text style={styles.serverChangeText}>Change</Text>
        </View>
      </Pressable>
      {enabledServices.map((svc) => {
        const status = statuses[svc.serviceId];
        const isTx = svc.serviceId === 'transmission';
        const txConnected = isTx && status?.connection.status === 'connected';
        return (
          <ServiceCard key={svc.serviceId} serviceId={svc.serviceId}
            summary={txConnected
              ? `↓ ${formatSpeed(downloadSpeed)} · ↑ ${formatSpeed(uploadSpeed)}`
              : status?.summary ?? 'Connecting...'}
            connected={status?.connection.status === 'connected'}
            metric={txConnected && freeSpace > 0 ? { value: formatBytes(freeSpace), label: 'free' } : status?.metric}
            onPress={() => {
              if (svc.serviceId === 'emby') { Linking.openURL(isLocal ? svc.localUrl : svc.remoteUrl); return; }
              const tab = tabMap[svc.serviceId];
              if (tab === 'Infra') {
                navigation.navigate('Main', { screen: 'Infra', params: { screen: 'InfraHome', params: { tab: svc.serviceId === 'gluetun' ? 'vpn' : 'docker' } } });
              } else if (tab) {
                navigation.navigate('Main', { screen: tab });
              }
            }} />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  headerBtn: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  serverCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: 'rgba(100, 255, 218, 0.06)', borderWidth: 1, borderColor: 'rgba(100, 255, 218, 0.15)', borderRadius: 14, padding: spacing.lg },
  serverIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(100, 255, 218, 0.1)', justifyContent: 'center', alignItems: 'center' },
  serverName: { ...typography.h3, color: colors.textPrimary },
  serverMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  serverChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  serverChangeText: { ...typography.micro, color: colors.primary, fontWeight: '700' },
  empty: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  setupButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary },
  setupButtonText: { ...typography.bodyBold, color: '#0f1023' },
});
