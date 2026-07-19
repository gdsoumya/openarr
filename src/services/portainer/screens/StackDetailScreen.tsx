import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { Badge } from '../../../core/components/Badge';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { usePolling } from '../../../core/hooks/usePolling';
import { useToastStore } from '../../../core/hooks/useToast';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getPortainerAdapter } from '../../adapterFactory';
import { ContainerStateBadge } from '../components/ContainerStateBadge';
import { DockerContainer, PortainerStack } from '../types';

export function StackDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { stackId, endpointId, name } = route.params as { stackId: number; endpointId: number; name: string };
  const config = useServiceConfig('portainer');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getPortainerAdapter(config, isLocal) : null), [config, isLocal]);
  const { alert } = useThemedAlert();
  const showToast = useToastStore((s) => s.show);

  const [stack, setStack] = useState<PortainerStack | null>(null);
  const [composeFile, setComposeFile] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [members, setMembers] = useState<DockerContainer[]>([]);
  const [actionPending, setActionPending] = useState(false);

  const fetch = useCallback(async () => {
    if (!adapter) return;
    const [stacks, containers] = await Promise.all([
      adapter.getStacks(),
      adapter.getContainers(endpointId).catch(() => [] as DockerContainer[]),
    ]);
    setStack(stacks.find((s) => s.Id === stackId) ?? null);
    // Compose lowercases project names, so compare case-insensitively
    setMembers(containers.filter((c) => c.Labels['com.docker.compose.project']?.toLowerCase() === name.toLowerCase()));
  }, [adapter, stackId, endpointId, name]);

  usePolling(fetch, 10000, !!adapter);

  const loadCompose = async () => {
    if (!adapter) return;
    if (showCompose) { setShowCompose(false); return; }
    try {
      if (!composeFile) setComposeFile(await adapter.getStackFile(stackId));
      setShowCompose(true);
    } catch (e: any) { alert('Error', e.message); }
  };

  const runStackAction = (label: string, fn: () => Promise<void>) => {
    alert(`${label} Stack`, `${label} all containers in "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: label === 'Stop' ? 'destructive' : 'default',
        onPress: async () => {
          setActionPending(true);
          try {
            await fn();
            showToast(`Stack ${label.toLowerCase()} requested`, 'success');
            await fetch().catch(() => {});
          } catch (e: any) { alert(`${label} Failed`, e.message); }
          setActionPending(false);
        },
      },
    ]);
  };

  const active = stack?.Status === 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>{members.length} containers</Text>
        </View>
        <Badge label={active ? 'active' : 'inactive'} variant="custom"
          customColor={active ? 'rgba(100, 255, 218, 0.25)' : 'rgba(255,255,255,0.12)'} />
      </View>

      <View style={styles.actionsRow}>
        {stack && (
          active ? (
            <Pressable style={[styles.actionBtn, actionPending && { opacity: 0.5 }]} disabled={actionPending}
              onPress={() => adapter && runStackAction('Stop', () => adapter.stopStack(stackId, endpointId))}>
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Stop Stack</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.actionBtn, actionPending && { opacity: 0.5 }]} disabled={actionPending}
              onPress={() => adapter && runStackAction('Start', () => adapter.startStack(stackId, endpointId))}>
              <Text style={[styles.actionBtnText, { color: colors.success }]}>Start Stack</Text>
            </Pressable>
          )
        )}
        <Pressable style={styles.actionBtn} onPress={loadCompose}>
          <Text style={styles.actionBtnText}>{showCompose ? 'Hide Compose' : 'View Compose'}</Text>
        </Pressable>
      </View>

      {showCompose && (
        <View style={styles.composeBox}>
          <ScrollView nestedScrollEnabled>
            <ScrollView horizontal nestedScrollEnabled>
              <Text style={styles.composeText} selectable>{composeFile || 'No compose file'}</Text>
            </ScrollView>
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionTitle}>Containers</Text>
      {members.map((c) => (
        <Pressable key={c.Id} style={styles.memberRow}
          onPress={() => navigation.navigate('ContainerDetail', { endpointId, containerId: c.Id, name: c.Names[0]?.replace(/^\//, '') })}>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName} numberOfLines={1}>{c.Names[0]?.replace(/^\//, '')}</Text>
            <Text style={styles.memberImage} numberOfLines={1}>{c.Image}</Text>
          </View>
          <ContainerStateBadge state={c.State} status={c.Status} />
        </Pressable>
      ))}
      {members.length === 0 && <Text style={styles.emptyText}>No containers found for this stack</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  actionBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surfaceCard, alignItems: 'center' },
  actionBtnText: { ...typography.bodyBold, color: colors.primary },
  composeBox: { marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: '#0a0b18', borderRadius: radii.md, padding: spacing.md, maxHeight: 400 },
  composeText: { fontFamily: 'monospace', fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  memberName: { ...typography.bodyBold, color: colors.textPrimary },
  memberImage: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
