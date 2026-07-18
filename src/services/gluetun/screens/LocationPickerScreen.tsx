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
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectMsg, setReconnectMsg] = useState('');

  const load = async () => {
    if (!adapter) return;
    setState('loading');
    try {
      const [choices, settings] = await Promise.all([adapter.getServerChoices(), adapter.getVpnSettings()]);
      setLocations(choices.locations ?? []);
      setProvider(choices.provider);
      const sel = settings.provider?.server_selection;
      setSelectedCountries(new Set((sel?.countries ?? []).map((c) => c.toLowerCase())));
      setSelectedCities(new Set((sel?.cities ?? []).map((c) => c.toLowerCase())));
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

  const toggleCountry = (country: string) => {
    const key = country.toLowerCase();
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Cascade: drop cities belonging to a deselected country
        setSelectedCities((cities) => {
          const cityNext = new Set(cities);
          locations.filter((l) => l.country.toLowerCase() === key)
            .forEach((l) => cityNext.delete(l.city.toLowerCase()));
          return cityNext;
        });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleCity = (loc: ServerChoiceLocation) => {
    const countryKey = loc.country.toLowerCase();
    const cityKey = loc.city.toLowerCase();
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityKey)) next.delete(cityKey);
      else next.add(cityKey);
      return next;
    });
    // Selecting a city implies its country
    setSelectedCountries((prev) => (prev.has(countryKey) ? prev : new Set(prev).add(countryKey)));
  };

  const apply = async () => {
    if (!adapter || reconnecting) return;
    setReconnecting(true);
    setReconnectMsg('Applying server selection...');
    try {
      await adapter.changeLocation([...selectedCountries], [...selectedCities]);
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

  const selectionCount = selectedCountries.size + selectedCities.size;

  return (
    <View style={styles.container}>
      <Text style={styles.providerText}>{provider} · tap a country to select it, or pick specific cities</Text>
      <SearchBar placeholder="Search country or city..." value={filter} onChangeText={setFilter} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.country}:${item.city}`}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: 90 }}
        renderSectionHeader={({ section }) => {
          const active = selectedCountries.has(section.title.toLowerCase());
          return (
            <Pressable style={[styles.countryHeader, active && styles.countryHeaderActive]} onPress={() => toggleCountry(section.title)}>
              <Text style={[styles.countryText, active && { color: colors.primary }]}>{section.title}</Text>
              {active && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
            </Pressable>
          );
        }}
        renderItem={({ item }) => {
          const active = selectedCities.has(item.city.toLowerCase());
          return (
            <Pressable style={styles.cityRow} onPress={() => toggleCity(item)}>
              <Text style={[styles.cityText, active && { color: colors.primary, fontWeight: '600' }]}>{item.city}</Text>
              <Text style={styles.serverCount}>{item.servers} servers</Text>
              {active && <MaterialCommunityIcons name="check" size={14} color={colors.primary} />}
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <Pressable
          style={[styles.applyBtn, selectionCount === 0 && { opacity: 0.5 }]}
          onPress={apply}
          disabled={selectionCount === 0}
        >
          <Text style={styles.applyBtnText}>Apply & Reconnect ({selectionCount} selected)</Text>
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
  countryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  countryHeaderActive: { backgroundColor: 'rgba(100, 255, 218, 0.08)' },
  countryText: { ...typography.bodyBold, color: colors.textPrimary },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  cityText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  serverCount: { ...typography.micro, color: colors.textMuted },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surfaceElevated },
  applyBtn: { paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center' },
  applyBtnText: { ...typography.bodyBold, color: '#0f1023' },
});
