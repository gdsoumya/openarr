import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedAlert } from '../core/components/ThemedAlert';
import { useNavigation } from '@react-navigation/native';
import { exportBackup } from '../core/storage/backup';
import { colors, spacing, radii, typography } from '../core/theme/tokens';
import { useServerStore } from '../stores/serverStore';
import { useConnectionStore } from '../stores/connectionStore';
import { appStorage } from '../core/storage/storage';
import { clearAdapters } from '../services/adapterFactory';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const setActiveServer = useServerStore((s) => s.setActiveServer);
  const isLocal = useConnectionStore((s) => s.isLocal);
  const navigation = useNavigation<any>();
  const { alert } = useThemedAlert();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      {/* Servers */}
      <Text style={styles.sectionTitle}>Servers</Text>
      {servers.map((srv) => {
        const isActive = srv.id === activeServerId;
        const enabledCount = srv.services.filter(s => s.enabled).length;
        const configuredCount = srv.services.filter(s => s.enabled && s.localUrl).length;
        return (
          <Pressable key={srv.id} style={[styles.row, isActive && styles.rowActive]}
            onPress={() => navigation.navigate('ServerSetup', { serverId: srv.id })}>
            <View style={styles.rowIcon}>
              <MaterialCommunityIcons name="server" size={20} color={isActive ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.rowContent}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{srv.name}</Text>
                {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
              </View>
              <Text style={styles.rowSub}>
                {configuredCount}/{enabledCount} services · {isActive ? (isLocal ? 'Local' : 'Remote') : 'Tap to edit'}
              </Text>
              {!isActive && (
                <Pressable style={styles.activateBtn} onPress={() => { setActiveServer(srv.id); clearAdapters(); }}>
                  <Text style={styles.activateBtnText}>Set Active</Text>
                </Pressable>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        );
      })}
      <Pressable style={styles.addButton} onPress={() => navigation.navigate('ServerSetup', { serverId: undefined })}>
        <Ionicons name="add" size={20} color={colors.primary} />
        <Text style={styles.addButtonText}>Add Server</Text>
      </Pressable>

      {/* Connection */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>Connection</Text>
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons name={isLocal ? 'wifi' : 'cellular'} size={20} color={isLocal ? colors.success : colors.info} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>{isLocal ? 'Local Network (WiFi)' : 'Remote (Cellular/VPN)'}</Text>
          <Text style={styles.rowSub}>{isLocal ? 'Using local server URLs' : 'Using remote server URLs'}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: isLocal ? colors.success : colors.info }]} />
      </View>

      {/* Data */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>Data</Text>
      <Pressable style={styles.row} onPress={() => {
        alert('Backup & Restore', 'Export your server configurations to a file, or restore from a previous backup.', [
          { text: 'Export Backup', onPress: () => exportBackup() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }}>
        <View style={styles.rowIcon}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.textMuted} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>Backup & Restore</Text>
          <Text style={styles.rowSub}>Export or import server configurations</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.row} onPress={() => {
        alert('Clear All Data', 'This will remove all server configurations and reset the app. This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear Everything', style: 'destructive', onPress: () => {
            servers.forEach(s => useServerStore.getState().removeServer(s.id));
            clearAdapters();
            alert('Data Cleared', 'All configurations have been removed.');
          }},
        ]);
      }}>
        <View style={styles.rowIcon}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, { color: colors.error }]}>Clear All Data</Text>
          <Text style={styles.rowSub}>Remove all servers and reset app</Text>
        </View>
      </Pressable>

      {/* About */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>About</Text>
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>OpenArr</Text>
          <Text style={styles.rowSub}>Version 0.1.0 · Free & Open Source</Text>
        </View>
      </View>

      <Pressable style={styles.row} onPress={() => Linking.openURL('https://github.com/openarr/openarr')}>
        <View style={styles.rowIcon}>
          <Ionicons name="logo-github" size={20} color={colors.textMuted} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>Source Code</Text>
          <Text style={styles.rowSub}>View on GitHub</Text>
        </View>
        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
      </Pressable>

      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons name="heart-outline" size={20} color={colors.error} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>Credits</Text>
          <Text style={styles.rowSub}>Powered by Sonarr, Radarr, Prowlarr, Bazarr, Transmission, TMDB</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  sectionTitle: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md },
  rowActive: { borderColor: colors.primaryBorder },
  rowIcon: { width: 32, alignItems: 'center' },
  rowContent: { flex: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  activeBadge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: colors.primaryBorder },
  activeBadgeText: { ...typography.badge, color: colors.primary },
  activateBtn: { marginTop: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider },
  activateBtnText: { ...typography.micro, color: colors.textMuted },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.lg, padding: spacing.lg, marginTop: spacing.sm },
  addButtonText: { ...typography.bodyBold, color: colors.primary },
});
