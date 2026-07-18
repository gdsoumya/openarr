import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../core/theme/tokens';
import { Badge } from '../core/components/Badge';
import { EmptyState } from '../core/components/EmptyState';
import { usePolling } from '../core/hooks/usePolling';
import { useServiceConfig } from '../core/hooks/useServer';
import { useConnectionStore } from '../stores/connectionStore';
import { getPortainerAdapter } from '../services/adapterFactory';
import { GluetunPanel } from '../services/gluetun/components/GluetunPanel';
import { PortainerEndpoint, PortainerStack } from '../services/portainer/types';
import { DashboardButton } from '../core/components/DashboardButton';

type InfraTab = 'docker' | 'vpn';

export function InfraHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const portainerConfig = useServiceConfig('portainer');
  const gluetunConfig = useServiceConfig('gluetun');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(
    () => (portainerConfig ? getPortainerAdapter(portainerConfig, isLocal) : null),
    [portainerConfig, isLocal],
  );

  const [activeTab, setActiveTab] = useState<InfraTab>(portainerConfig || !gluetunConfig ? 'docker' : 'vpn');
  const [endpoints, setEndpoints] = useState<PortainerEndpoint[]>([]);
  const [stacks, setStacks] = useState<PortainerStack[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dockerError, setDockerError] = useState('');

  const fetchDocker = useCallback(async () => {
    if (!adapter) return;
    try {
      const [eps, stks] = await Promise.all([adapter.getEndpoints(), adapter.getStacks().catch(() => [] as PortainerStack[])]);
      setEndpoints(eps);
      setStacks(stks);
      setDockerError('');
    } catch (e: any) {
      setDockerError(e.message ?? 'Cannot reach Portainer');
    }
  }, [adapter]);

  usePolling(fetchDocker, 15000, !!adapter && activeTab === 'docker');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDocker().catch(() => {});
    setRefreshing(false);
  }, [fetchDocker]);

  const tabs: Array<{ id: InfraTab; label: string }> = [
    { id: 'docker', label: 'Docker' },
    { id: 'vpn', label: 'VPN' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Infra</Text>
        <DashboardButton />
      </View>

      <View style={styles.tabsWrapper}>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <Pressable key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20, paddingTop: spacing.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {activeTab === 'docker' && !portainerConfig && (
          <EmptyState icon="🐳" title="Portainer not configured" message="Enable Portainer in Settings → Server to manage stacks and containers." />
        )}

        {activeTab === 'docker' && portainerConfig && dockerError !== '' && endpoints.length === 0 && (
          <EmptyState icon="⚠️" title="Portainer unreachable" message={dockerError} />
        )}

        {activeTab === 'docker' && portainerConfig && endpoints.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Environments</Text>
            {endpoints.map((ep) => {
              const snap = ep.Snapshots?.[0];
              const up = ep.Status === 1;
              return (
                <Pressable key={ep.Id} style={styles.card}
                  onPress={() => navigation.navigate('Containers', { endpointId: ep.Id, endpointName: ep.Name })}>
                  <View style={styles.cardRow}>
                    <MaterialCommunityIcons name="docker" size={22} color={colors.portainer} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{ep.Name}</Text>
                      {snap && (
                        <Text style={styles.cardSub}>
                          {snap.RunningContainerCount} running · {snap.StoppedContainerCount} stopped
                          {snap.UnhealthyContainerCount > 0 ? ` · ${snap.UnhealthyContainerCount} unhealthy` : ''}
                          {` · Docker ${snap.DockerVersion}`}
                        </Text>
                      )}
                    </View>
                    <Badge label={up ? 'up' : 'down'} variant="custom"
                      customColor={up ? 'rgba(100, 255, 218, 0.25)' : 'rgba(233, 69, 96, 0.5)'} />
                  </View>
                </Pressable>
              );
            })}

            {stacks.length > 0 && <Text style={styles.sectionTitle}>Stacks</Text>}
            {stacks.map((stack) => (
              <Pressable key={stack.Id} style={styles.card}
                onPress={() => navigation.navigate('StackDetail', { stackId: stack.Id, endpointId: stack.EndpointId, name: stack.Name })}>
                <View style={styles.cardRow}>
                  <MaterialCommunityIcons name="layers-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.cardTitle, { flex: 1 }]}>{stack.Name}</Text>
                  <Badge label={stack.Status === 1 ? 'active' : 'inactive'} variant="custom"
                    customColor={stack.Status === 1 ? 'rgba(100, 255, 218, 0.25)' : 'rgba(255,255,255,0.12)'} />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {activeTab === 'vpn' && <GluetunPanel />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  tabsWrapper: { height: 44, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, height: 44, alignItems: 'center' },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: spacing.xl, marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { ...typography.bodyBold, color: colors.textPrimary },
  cardSub: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
});
