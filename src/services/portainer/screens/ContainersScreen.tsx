import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { SearchBar } from '../../../core/components/SearchBar';
import { EmptyState } from '../../../core/components/EmptyState';
import { usePolling } from '../../../core/hooks/usePolling';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getPortainerAdapter } from '../../adapterFactory';
import { ContainerStateBadge } from '../components/ContainerStateBadge';
import { DockerContainer } from '../types';

export function ContainersScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { endpointId } = route.params as { endpointId: number };
  const config = useServiceConfig('portainer');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getPortainerAdapter(config, isLocal) : null), [config, isLocal]);

  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [filter, setFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetch = useCallback(async () => {
    if (!adapter) return;
    const data = await adapter.getContainers(endpointId);
    setContainers(data.sort((a, b) => (a.Names[0] ?? '').localeCompare(b.Names[0] ?? '')));
    setLoaded(true);
  }, [adapter, endpointId]);

  usePolling(fetch, 10000, !!adapter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch().catch(() => {});
    setRefreshing(false);
  }, [fetch]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return containers;
    return containers.filter((c) =>
      (c.Names[0] ?? '').toLowerCase().includes(q) || c.Image.toLowerCase().includes(q));
  }, [containers, filter]);

  const portsSummary = (c: DockerContainer) => {
    const published = c.Ports.filter((p) => p.PublicPort).map((p) => `${p.PublicPort}:${p.PrivatePort}`);
    return [...new Set(published)].slice(0, 3).join(' · ');
  };

  return (
    <View style={styles.container}>
      <SearchBar placeholder="Filter containers..." value={filter} onChangeText={setFilter} />
      <FlashList
        data={visible}
        keyExtractor={(item) => item.Id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={loaded
          ? <EmptyState icon="📦" title="No containers" message={filter ? 'Nothing matches the filter' : 'This environment has no containers'} />
          : <Text style={styles.loading}>Loading containers...</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ContainerDetail', { endpointId, containerId: item.Id, name: item.Names[0]?.replace(/^\//, '') })}
          >
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={1}>{item.Names[0]?.replace(/^\//, '') ?? item.Id.slice(0, 12)}</Text>
              <ContainerStateBadge state={item.State} status={item.Status} />
            </View>
            <Text style={styles.image} numberOfLines={1}>{item.Image}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{item.Status}</Text>
              {portsSummary(item) ? <Text style={styles.metaText}>{portsSummary(item)}</Text> : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase, paddingTop: spacing.md },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxxl },
  row: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  name: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  image: { ...typography.micro, color: colors.textMuted, marginBottom: 4 },
  meta: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  metaText: { ...typography.micro, color: colors.textSecondary },
});
