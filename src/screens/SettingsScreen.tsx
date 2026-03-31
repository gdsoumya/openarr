import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography, serviceConfig } from '../core/theme/tokens';
import { useServerStore } from '../stores/serverStore';

export function SettingsScreen() {
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const setActiveServer = useServerStore((s) => s.setActiveServer);
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Servers</Text>
      {servers.map((srv) => (
        <Pressable key={srv.id} style={[styles.row, srv.id === activeServerId && styles.rowActive]}
          onPress={() => { setActiveServer(srv.id); }}
          onLongPress={() => navigation.navigate('ServerSetup', { serverId: srv.id })}>
          <View>
            <Text style={styles.rowTitle}>{srv.name}</Text>
            <Text style={styles.rowSub}>{srv.services.filter(s => s.enabled).length} services · {srv.id === activeServerId ? 'Active' : 'Tap to activate'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <Pressable style={styles.addButton} onPress={() => navigation.navigate('ServerSetup', { serverId: undefined })}>
        <Text style={styles.addButtonText}>+ Add Server</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>General</Text>
      {['Home Network', 'Notifications', 'Appearance', 'Backup / Restore', 'About'].map((item) => (
        <Pressable key={item} style={styles.row}>
          <Text style={styles.rowTitle}>{item}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { padding: spacing.xl, paddingBottom: 100 },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.sm },
  rowActive: { borderColor: colors.primaryBorder },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.textMuted },
  addButton: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  addButtonText: { ...typography.bodyBold, color: colors.primary },
});
