import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { SearchBar } from '../../../core/components/SearchBar';
import { ErrorState } from '../../../core/components/ErrorState';
import { useToastStore } from '../../../core/hooks/useToast';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getGluetunAdapter } from '../../adapterFactory';
import { ServerChoiceLocation } from '../types';

type LoadState = 'loading' | 'loaded' | 'error';

export function LocationPickerScreen() {
  const navigation = useNavigation<any>();
  const config = useServiceConfig('gluetun');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getGluetunAdapter(config, isLocal) : null), [config, isLocal]);
  const showToast = useToastStore((s) => s.show);

  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<ServerChoiceLocation[]>([]);
  const [provider, setProvider] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<ServerChoiceLocation | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectMsg, setReconnectMsg] = useState('');

  const load = async () => {
    if (!adapter) return;
    setState('loading');
    try {
      const [choices, settings] = await Promise.all([adapter.getServerChoices(), adapter.getVpnSettings()]);
      const locs = choices.locations ?? [];
      setLocations(locs);
      setProvider(choices.provider);
      // Preselect the currently configured city if there is exactly one
      const sel = settings.provider?.server_selection;
      const currentCity = (sel?.cities ?? [])[0]?.toLowerCase();
      if (currentCity) {
        setSelected(locs.find((l) => l.city.toLowerCase() === currentCity) ?? null);
      }
      setState('loaded');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load server choices');
      setState('error');
    }
  };

  useEffect(() => { load(); }, [adapter]);

  const sections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const byCountry = new Map<string, ServerChoiceLocation[]>();
    for (const loc of locations) {
      if (q && !loc.country.toLowerCase().includes(q) && !loc.city.toLowerCase().includes(q)) continue;
      const list = byCountry.get(loc.country) ?? [];
      list.push(loc);
      byCountry.set(loc.country, list);
    }
    return [...byCountry.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, cities]) => ({ title: country, data: cities }));
  }, [locations, filter]);

  const isSelected = (loc: ServerChoiceLocation) =>
    selected?.country === loc.country && selected?.city === loc.city;

  const apply = async () => {
    if (!adapter || !selected || reconnecting) return;
    setReconnecting(true);
    setReconnectMsg(`Switching to ${selected.city}, ${selected.country}...`);
    try {
      await adapter.changeLocation([selected.country.toLowerCase()], [selected.city.toLowerCase()]);
      setReconnectMsg('Reconnecting VPN — this can take up to 2 minutes...');
      // Poll the public IP until the new tunnel settles
      let settled = false;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const ip = await adapter.getPublicIp().catch(() => null);
        if (ip?.public_ip) {
          const where = [ip.city, ip.country].filter(Boolean).join(', ');
          showToast(`Connected — ${ip.public_ip}${where ? ` (${where})` : ''}`, 'success');
          settled = true;
          break;
        }
      }
      if (!settled) showToast('VPN restarted; still negotiating — check the VPN tab.', 'info');
      navigation.goBack();
    } catch (e: any) {
      showToast(`Failed to apply selection: ${e.message}`, 'error');
      setReconnecting(false);
    }
  };

  if (reconnecting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.reconnectText}>{reconnectMsg}</Text>
      </View>
    );
  }

  if (state === 'loading') {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (state === 'error') {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.providerText}>{provider} · pick a city to connect through</Text>
      <SearchBar placeholder="Search country or city..." value={filter} onChangeText={setFilter} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.country}:${item.city}`}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: 90 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.countryHeader}>
            <Text style={styles.countryText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const active = isSelected(item);
          return (
            <Pressable style={[styles.cityRow, active && styles.cityRowActive]}
              onPress={() => setSelected(active ? null : item)}>
              <Text style={[styles.cityText, active && { color: colors.primary, fontWeight: '600' }]}>{item.city}</Text>
              <Text style={styles.serverCount}>{item.servers} servers</Text>
              {active && <MaterialCommunityIcons name="check-circle" size={16} color={colors.primary} />}
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <Pressable
          style={[styles.applyBtn, !selected && { opacity: 0.5 }]}
          onPress={apply}
          disabled={!selected}
        >
          <Text style={styles.applyBtnText}>
            {selected ? `Connect via ${selected.city}` : 'Select a city'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase, paddingTop: spacing.md },
  center: { flex: 1, backgroundColor: colors.surfaceBase, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  reconnectText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  providerText: { ...typography.caption, color: colors.textMuted, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  countryHeader: { backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  countryText: { ...typography.bodyBold, color: colors.textPrimary },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  cityRowActive: { backgroundColor: 'rgba(100, 255, 218, 0.08)' },
  cityText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  serverCount: { ...typography.micro, color: colors.textMuted },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  applyBtn: { paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center' },
  applyBtnText: { ...typography.bodyBold, color: '#0f1023' },
});
