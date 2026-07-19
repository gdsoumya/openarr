import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { usePolling } from '../../../core/hooks/usePolling';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getPortainerAdapter } from '../../adapterFactory';

const TAIL_OPTIONS = [100, 500, 1000];

export function ContainerLogsScreen() {
  const route = useRoute<any>();
  const { endpointId, containerId } = route.params as { endpointId: number; containerId: string };
  const config = useServiceConfig('portainer');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => (config ? getPortainerAdapter(config, isLocal) : null), [config, isLocal]);

  const [logs, setLogs] = useState('');
  const [tail, setTail] = useState(100);
  const [timestamps, setTimestamps] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const fetch = useCallback(async () => {
    if (!adapter) return;
    try {
      const text = await adapter.getContainerLogs(endpointId, containerId, tail, timestamps);
      setLogs(text);
      setError('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load logs');
    }
  }, [adapter, endpointId, containerId, tail, timestamps]);

  usePolling(fetch, 5000, !!adapter && autoRefresh);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {TAIL_OPTIONS.map((n) => (
          <Pressable key={n} style={[styles.chip, tail === n && styles.chipActive]} onPress={() => setTail(n)}>
            <Text style={[styles.chipText, tail === n && styles.chipTextActive]}>{n}</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.chip, timestamps && styles.chipActive]} onPress={() => setTimestamps((t) => !t)}>
          <Text style={[styles.chipText, timestamps && styles.chipTextActive]}>Timestamps</Text>
        </Pressable>
        <View style={styles.autoRow}>
          <Text style={styles.chipText}>Auto</Text>
          <Switch value={autoRefresh} onValueChange={setAutoRefresh}
            trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} thumbColor="#fff" />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        ref={scrollRef}
        style={styles.logScroll}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <ScrollView horizontal>
          <Text style={styles.logText} selectable>{logs || 'No log output'}</Text>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexWrap: 'wrap' },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.divider },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  chipText: { ...typography.micro, color: colors.textMuted },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 'auto' },
  error: { ...typography.caption, color: colors.error, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  logScroll: { flex: 1, backgroundColor: '#0a0b18', marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radii.md, padding: spacing.sm },
  logText: { fontFamily: 'monospace', fontSize: 11, lineHeight: 16, color: colors.textSecondary, padding: spacing.sm },
});
