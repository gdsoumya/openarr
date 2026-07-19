import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking, TextInput } from 'react-native';
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
import { useSettingsStore } from '../stores/settingsStore';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const setActiveServer = useServerStore((s) => s.setActiveServer);
  const isLocal = useConnectionStore((s) => s.isLocal);
  const navigation = useNavigation<any>();
  const { alert } = useThemedAlert();

  const settings = useSettingsStore();
  const [tmdbDraft, setTmdbDraft] = useState(settings.tmdbToken ?? '');
  const [omdbDraft, setOmdbDraft] = useState(settings.omdbKey ?? '');
  const [regionDraft, setRegionDraft] = useState(settings.region);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}>
      {/* Servers */}
      <Text style={styles.sectionTitle}>Servers</Text>
      {servers.map((srv) => {
        const isActive = srv.id === activeServerId;
        const enabledCount = srv.services.filter(s => s.enabled).length;
        const configuredCount = srv.services.filter(s => s.enabled && s.localUrl).length;
        return (
          <Pressable key={srv.id} style={[styles.row, isActive && styles.rowActive]}
            onPress={() => navigation.navigate('ServerSetup', { serverId: srv.id })}>
            <Pressable style={styles.rowIcon} hitSlop={8} onPress={() => { if (!isActive) { setActiveServer(srv.id); clearAdapters(); } }}>
              <Ionicons name={isActive ? 'radio-button-on' : 'radio-button-off'} size={22} color={isActive ? colors.primary : colors.textMuted} />
            </Pressable>
            <View style={styles.rowContent}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{srv.name}</Text>
                {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
              </View>
              <Text style={styles.rowSub}>
                {configuredCount}/{enabledCount} services{isActive ? ` · ${isLocal ? 'Local' : 'Remote'}` : ' · tap circle to activate'}
              </Text>
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

      {/* Appearance */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>Appearance</Text>
      <View style={styles.segmentRow}>
        {([
          { id: 'aurora', label: 'Aurora Gradient' },
          { id: 'posters', label: 'Poster Wall' },
        ] as const).map((opt) => {
          const active = settings.backgroundStyle === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => settings.setBackgroundStyle(opt.id)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Discovery */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>Discovery</Text>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>TMDB Read Access Token</Text>
        <Text style={styles.inputHint}>themoviedb.org → Settings → API → API Read Access Token</Text>
        <TextInput
          style={styles.input}
          value={tmdbDraft}
          onChangeText={setTmdbDraft}
          onEndEditing={() => settings.setTmdbToken(tmdbDraft)}
          placeholder="eyJ..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>OMDB API Key (IMDB/RT ratings)</Text>
        <Text style={styles.inputHint}>Free key at omdbapi.com/apikey.aspx</Text>
        <TextInput
          style={styles.input}
          value={omdbDraft}
          onChangeText={setOmdbDraft}
          onEndEditing={() => settings.setOmdbKey(omdbDraft)}
          placeholder="OMDB key"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Streaming Region</Text>
        <Text style={styles.inputHint}>Two-letter country code for watch providers (e.g. US, IN, GB)</Text>
        <TextInput
          style={[styles.input, { width: 100 }]}
          value={regionDraft}
          onChangeText={setRegionDraft}
          onEndEditing={() => settings.setRegion(regionDraft)}
          placeholder="US"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={2}
        />
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
  segmentRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radii.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primaryMuted, borderColor: 'rgba(100,255,218,0.35)' },
  segmentText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  segmentTextActive: { color: colors.primary, fontWeight: '600' },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 20 },
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
  activateBtn: { marginTop: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.divider },
  activateBtnText: { ...typography.micro, color: colors.textMuted },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.lg, padding: spacing.lg, marginTop: spacing.sm },
  addButtonText: { ...typography.bodyBold, color: colors.primary },
  inputRow: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.sm },
  inputLabel: { ...typography.bodyBold, color: colors.textPrimary },
  inputHint: { ...typography.micro, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.md, padding: spacing.md },
});
