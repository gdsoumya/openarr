import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useThemedAlert } from '../core/components/ThemedAlert';
import { useNavigation } from '@react-navigation/native';
import { exportBackup } from '../core/storage/backup';
import { colors, spacing, radii, typography, serviceConfig } from '../core/theme/tokens';
import { useServerStore } from '../stores/serverStore';

export function SettingsScreen() {
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const setActiveServer = useServerStore((s) => s.setActiveServer);
  const navigation = useNavigation<any>();
  const { alert } = useThemedAlert();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Servers</Text>
      {servers.map((srv) => {
        const isActive = srv.id === activeServerId;
        const enabledCount = srv.services.filter(s => s.enabled).length;
        const configuredCount = srv.services.filter(s => s.enabled && s.localUrl).length;
        return (
          <Pressable key={srv.id} style={[styles.row, isActive && styles.rowActive]}
            onPress={() => navigation.navigate('ServerSetup', { serverId: srv.id })}>
            <View style={styles.rowContent}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{srv.name}</Text>
                {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
              </View>
              <Text style={styles.rowSub}>{configuredCount}/{enabledCount} services configured</Text>
              {!isActive && (
                <Pressable style={styles.activateBtn} onPress={(e) => { e.stopPropagation; setActiveServer(srv.id); }}>
                  <Text style={styles.activateBtnText}>Set Active</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        );
      })}
      <Pressable style={styles.addButton} onPress={() => navigation.navigate('ServerSetup', { serverId: undefined })}>
        <Text style={styles.addButtonText}>+ Add Server</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>General</Text>
      {['Home Network', 'Notifications', 'Appearance', 'Backup / Restore', 'About'].map((item) => (
        <Pressable
          key={item}
          style={styles.row}
          onPress={() => {
            if (item === 'Backup / Restore') {
              alert('Backup', 'What would you like to do?', [
                { text: 'Export Backup', onPress: () => exportBackup() },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }
          }}
        >
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
  rowContent: { flex: 1, marginRight: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  activeBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: colors.primaryBorder },
  activeBadgeText: { ...typography.badge, color: colors.primary },
  activateBtn: { marginTop: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  activateBtnText: { ...typography.micro, color: colors.textMuted },
  chevron: { fontSize: 20, color: colors.textMuted },
  addButton: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  addButtonText: { ...typography.bodyBold, color: colors.primary },
});
