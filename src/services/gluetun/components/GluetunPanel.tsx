import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { EmptyState } from '../../../core/components/EmptyState';
import { usePolling } from '../../../core/hooks/usePolling';
import { useToastStore } from '../../../core/hooks/useToast';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getGluetunAdapter } from '../../adapterFactory';
import { PortForward, PublicIp, VpnSettings, VpnStatus } from '../types';

export function GluetunPanel() {
  const navigation = useNavigation<any>();
  const config = useServiceConfig('gluetun');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getGluetunAdapter(config, isLocal) : null), [config, isLocal]);
  const showToast = useToastStore((s) => s.show);

  const [vpnStatus, setVpnStatus] = useState<VpnStatus | null>(null);
  const [publicIp, setPublicIp] = useState<PublicIp | null>(null);
  const [portForward, setPortForward] = useState<PortForward | null>(null);
  const [settings, setSettings] = useState<VpnSettings | null>(null);
  const [togglePending, setTogglePending] = useState(false);
  const [refreshingIp, setRefreshingIp] = useState(false);
  const [updaterPending, setUpdaterPending] = useState(false);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    if (!adapter) return;
    try {
      const status = await adapter.getVpnStatus();
      setVpnStatus(status);
      setError('');
      const [ip, pf, s] = await Promise.all([
        adapter.getPublicIp().catch(() => null),
        adapter.getPortForward().catch(() => null),
        adapter.getVpnSettings().catch(() => null),
      ]);
      setPublicIp(ip);
      setPortForward(pf);
      if (s) setSettings(s);
    } catch (e: any) {
      setError(e.message ?? 'Cannot reach gluetun control server');
    }
  }, [adapter]);

  usePolling(fetch, 10000, !!adapter);

  const toggleVpn = async (value: boolean) => {
    if (!adapter || togglePending) return;
    setTogglePending(true);
    setVpnStatus({ status: value ? 'running' : 'stopped' });
    try {
      await adapter.setVpnStatus(value ? 'running' : 'stopped');
      showToast(value ? 'VPN starting...' : 'VPN stopped', 'info');
    } catch (e: any) {
      showToast(`VPN toggle failed: ${e.message}`, 'error');
    }
    setTogglePending(false);
    fetch().catch(() => {});
  };

  const refreshIp = async () => {
    if (!adapter || refreshingIp) return;
    setRefreshingIp(true);
    try {
      await adapter.refreshPublicIp();
      const ip = await adapter.getPublicIp();
      setPublicIp(ip);
    } catch (e: any) { showToast(`IP refresh failed: ${e.message}`, 'error'); }
    setRefreshingIp(false);
  };

  const triggerUpdater = async () => {
    if (!adapter || updaterPending) return;
    setUpdaterPending(true);
    try {
      await adapter.triggerUpdater();
      showToast('Server list update started', 'success');
    } catch (e: any) { showToast(`Updater failed: ${e.message}`, 'error'); }
    setUpdaterPending(false);
  };

  if (!config) {
    return <EmptyState icon="🔒" title="Gluetun not configured" message="Enable Gluetun VPN in Settings → Server to manage your VPN." />;
  }

  if (error && !vpnStatus) {
    return <EmptyState icon="⚠️" title="Control server unreachable" message={error} />;
  }

  const running = vpnStatus?.status === 'running';
  const selection = settings?.provider?.server_selection;
  const locationSummary = [
    ...(selection?.countries ?? []),
    ...(selection?.cities ?? []),
  ].join(', ') || 'Any location';
  const where = publicIp ? [publicIp.city, publicIp.country].filter(Boolean).join(', ') : '';

  return (
    <View>
      {/* Status card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.dot, { backgroundColor: running ? colors.success : colors.error }]} />
          <Text style={styles.cardTitle}>{running ? (publicIp?.public_ip ? 'Connected' : 'Connecting...') : 'VPN Stopped'}</Text>
          <Switch value={running} onValueChange={toggleVpn} disabled={togglePending}
            trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} thumbColor="#fff" />
        </View>
        {settings?.provider?.name && (
          <Text style={styles.cardSub}>{settings.provider.name}{settings.type ? ` · ${settings.type}` : ''}</Text>
        )}
      </View>

      {/* IP card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="ip-network-outline" size={18} color={colors.primary} />
          <Text style={styles.cardTitle}>{publicIp?.public_ip || '—'}</Text>
          <Pressable onPress={refreshIp} hitSlop={8} disabled={refreshingIp}>
            <MaterialCommunityIcons name="refresh" size={18} color={refreshingIp ? colors.textMuted : colors.primary} />
          </Pressable>
        </View>
        {where ? <Text style={styles.cardSub}>{where}</Text> : null}
        {publicIp?.organization ? <Text style={styles.cardSub}>{publicIp.organization}</Text> : null}
        {portForward?.port ? <Text style={styles.cardSub}>Forwarded port: {portForward.port}</Text> : null}
      </View>

      {/* Location */}
      <Pressable style={styles.card} onPress={() => navigation.navigate('GluetunLocationPicker')}>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Server Location</Text>
            <Text style={styles.cardSub} numberOfLines={2}>{locationSummary}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        </View>
      </Pressable>

      {/* Updater */}
      <Pressable style={styles.card} onPress={triggerUpdater} disabled={updaterPending}>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="cloud-download-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Update Server List</Text>
            <Text style={styles.cardSub}>{updaterPending ? 'Starting...' : 'Refresh available VPN servers'}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  cardSub: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
