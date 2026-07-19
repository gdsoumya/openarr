import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { ActionSheet, ActionSheetOption } from '../../../core/components/ActionSheet';
import { ProgressBar } from '../../../core/components/ProgressBar';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { usePolling } from '../../../core/hooks/usePolling';
import { useToastStore } from '../../../core/hooks/useToast';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getPortainerAdapter } from '../../adapterFactory';
import { ContainerStateBadge } from '../components/ContainerStateBadge';
import { KeyValueList } from '../components/KeyValueList';
import { ContainerInspect, ContainerStats } from '../types';
import { formatBytes } from '../../../core/utils/format';

export function ContainerDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { endpointId, containerId, name } = route.params as { endpointId: number; containerId: string; name?: string };
  const config = useServiceConfig('portainer');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getPortainerAdapter(config, isLocal) : null), [config, isLocal]);
  const { alert } = useThemedAlert();
  const showToast = useToastStore((s) => s.show);

  const [inspect, setInspect] = useState<ContainerInspect | null>(null);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const fetch = useCallback(async () => {
    if (!adapter) return;
    const data = await adapter.inspectContainer(endpointId, containerId);
    setInspect(data);
    if (data.State.Running) {
      const s = await adapter.getContainerStats(endpointId, containerId).catch(() => null);
      setStats(s);
    } else {
      setStats(null);
    }
  }, [adapter, endpointId, containerId]);

  usePolling(fetch, 10000, !!adapter);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    if (actionPending) return;
    setActionPending(true);
    try {
      await fn();
      showToast(`${label} succeeded`, 'success');
      await fetch().catch(() => {});
    } catch (e: any) {
      alert(`${label} Failed`, e.message);
    }
    setActionPending(false);
  };

  const actions: ActionSheetOption[] = useMemo(() => {
    if (!adapter || !inspect) return [];
    const running = inspect.State.Running;
    const options: ActionSheetOption[] = [];
    if (!running) {
      options.push({ label: 'Start', icon: '▶️', onPress: () => runAction('Start', () => adapter.startContainer(endpointId, containerId)) });
    }
    if (running) {
      options.push({ label: 'Restart', icon: '🔄', onPress: () => runAction('Restart', () => adapter.restartContainer(endpointId, containerId)) });
      options.push({ label: 'Stop', icon: '⏹', onPress: () => runAction('Stop', () => adapter.stopContainer(endpointId, containerId)) });
      options.push({
        label: 'Kill', icon: '⚡', destructive: true,
        onPress: () => alert('Kill Container', 'Force-kill this container? Unsaved state will be lost.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Kill', style: 'destructive', onPress: () => runAction('Kill', () => adapter.killContainer(endpointId, containerId)) },
        ]),
      });
    }
    return options;
  }, [adapter, inspect, endpointId, containerId, actionPending]);

  if (!inspect) {
    return <View style={styles.container}><Text style={styles.loading}>Loading container...</Text></View>;
  }

  const displayName = name ?? inspect.Name?.replace(/^\//, '') ?? containerId.slice(0, 12);
  const ports = Object.entries(inspect.NetworkSettings?.Networks ?? {}).map(([net, cfg]) => ({ key: net, value: cfg.IPAddress || '—' }));
  const env = (inspect.Config.Env ?? []).map((e) => {
    const idx = e.indexOf('=');
    return { key: e.slice(0, idx), value: e.slice(idx + 1) };
  });
  const labels = Object.entries(inspect.Config.Labels ?? {}).map(([key, value]) => ({ key, value }));
  const mounts = (inspect.Mounts ?? []).map((m) => ({ key: m.Destination, value: `${m.Source}${m.RW ? '' : ' (ro)'}` }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{inspect.Config.Image}</Text>
          </View>
          <ContainerStateBadge state={inspect.State.Status} status={inspect.State.Health ? `(${inspect.State.Health.Status})` : undefined} />
        </View>

        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>CPU</Text>
              <Text style={styles.statValue}>{stats.cpuPercent.toFixed(1)}%</Text>
            </View>
            <ProgressBar progress={stats.cpuPercent / 100} height={4} />
            <View style={[styles.statRow, { marginTop: spacing.md }]}>
              <Text style={styles.statLabel}>Memory</Text>
              <Text style={styles.statValue}>
                {formatBytes(stats.memUsed)}{stats.memLimit > 0 ? ` / ${formatBytes(stats.memLimit)}` : ''}
              </Text>
            </View>
            <ProgressBar progress={stats.memLimit > 0 ? stats.memUsed / stats.memLimit : 0} height={4} />
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Started: {inspect.State.StartedAt ? new Date(inspect.State.StartedAt).toLocaleString() : '—'}</Text>
          <Text style={styles.infoText}>Restart policy: {inspect.HostConfig.RestartPolicy?.Name || 'none'}</Text>
          {!inspect.State.Running && <Text style={styles.infoText}>Exit code: {inspect.State.ExitCode}</Text>}
        </View>

        <Pressable style={styles.logsBtn} onPress={() => navigation.navigate('ContainerLogs', { endpointId, containerId, name: displayName })}>
          <MaterialCommunityIcons name="text-box-outline" size={16} color={colors.primary} />
          <Text style={styles.logsBtnText}>View Logs</Text>
        </Pressable>

        <KeyValueList title="Networks" items={ports} />
        <KeyValueList title="Mounts" items={mounts} />
        <KeyValueList title="Environment" items={env} />
        <KeyValueList title="Labels" items={labels} />
      </ScrollView>

      <View style={styles.actionBar}>
        <Pressable
          style={[styles.actionBtn, actionPending && { opacity: 0.5 }]}
          onPress={() => setShowActions(true)}
          disabled={actionPending}
        >
          <Text style={styles.actionBtnText}>{actionPending ? 'Working...' : 'Actions'}</Text>
        </Pressable>
      </View>

      <ActionSheet
        visible={showActions}
        title={displayName}
        subtitle={inspect.State.Status}
        options={actions}
        onClose={() => setShowActions(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statsCard: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  statLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  infoCard: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md, gap: 4 },
  infoText: { ...typography.caption, color: colors.textSecondary },
  logsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  logsBtnText: { ...typography.bodyBold, color: colors.primary },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  actionBtn: { paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center' },
  actionBtnText: { ...typography.bodyBold, color: colors.primary },
});
