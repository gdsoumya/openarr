import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Switch, Pressable } from 'react-native';
import { useThemedAlert } from '../core/components/ThemedAlert';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography, serviceConfig, ServiceId } from '../core/theme/tokens';
import { useServerStore } from '../stores/serverStore';
import { useConnectionStore } from '../stores/connectionStore';
import { getAdapter, clearAdapters } from '../services/adapterFactory';

type AuthMode = 'apikey' | 'basic';

const SERVICE_META: Record<ServiceId, { defaultPort: string; authMode: AuthMode; authHint: string; urlSuffix?: string }> = {
  transmission: { defaultPort: '9091', authMode: 'basic', authHint: 'Username/password from Transmission → Settings → Web (/rpc is appended automatically)', urlSuffix: '/transmission' },
  sonarr: { defaultPort: '8989', authMode: 'apikey', authHint: 'Settings → General → API Key' },
  radarr: { defaultPort: '7878', authMode: 'apikey', authHint: 'Settings → General → API Key' },
  prowlarr: { defaultPort: '9696', authMode: 'apikey', authHint: 'Settings → General → API Key' },
  bazarr: { defaultPort: '6767', authMode: 'apikey', authHint: 'Settings → General → API Key' },
};

export function ServiceConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { serverId, serviceId } = route.params as { serverId: string; serviceId: ServiceId };
  const cfg = serviceConfig[serviceId];
  const meta = SERVICE_META[serviceId];

  const server = useServerStore((s) => s.servers.find((srv) => srv.id === serverId));
  const updateServer = useServerStore((s) => s.updateServer);
  const isLocal = useConnectionStore((s) => s.isLocal);

  const existing = server?.services.find((s) => s.serviceId === serviceId);

  const [localUrl, setLocalUrl] = useState(existing?.localUrl ?? '');
  const [remoteUrl, setRemoteUrl] = useState(existing?.remoteUrl ?? '');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [username, setUsername] = useState(existing?.username ?? '');
  const [password, setPassword] = useState(existing?.password ?? '');
  const [sslIgnoreCert, setSslIgnoreCert] = useState(existing?.sslIgnoreCert ?? false);
  const [basePath, setBasePath] = useState(existing?.basePath ?? '');
  const [showSecret, setShowSecret] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'testing' | 'success' | 'fail'>('none');
  const [testError, setTestError] = useState('');

  const { alert } = useThemedAlert();
  const usesApiKey = meta.authMode === 'apikey';

  const buildServiceConfig = () => ({
    serviceId,
    enabled: true,
    localUrl: localUrl.trim(),
    remoteUrl: remoteUrl.trim() || localUrl.trim(),
    // Only set the auth method this service uses
    apiKey: usesApiKey ? (apiKey.trim() || undefined) : undefined,
    username: !usesApiKey ? (username.trim() || undefined) : undefined,
    password: !usesApiKey ? (password.trim() || undefined) : undefined,
    sslIgnoreCert,
    basePath: basePath.trim() || undefined,
  });

  const testConnection = async () => {
    const svcConfig = buildServiceConfig();
    if (!svcConfig.localUrl) {
      alert('Error', 'Enter a Local URL');
      return;
    }
    setTestResult('testing');
    setTestError('');
    try {
      clearAdapters();
      const adapter = getAdapter(svcConfig, isLocal);
      const ok = await adapter.testConnection();
      setTestResult(ok ? 'success' : 'fail');
      if (!ok) setTestError('Connection returned false — check URL and credentials');
    } catch (e: any) {
      setTestResult('fail');
      const url = e.config?.baseURL
        ? `${e.config.baseURL}${e.config.url || ''}`
        : svcConfig.localUrl;
      const status = e.response?.status ? `HTTP ${e.response.status}` : e.code || 'Network Error';
      setTestError(`${status} → ${url}\n${e.message || ''}`);
    }
  };

  const save = () => {
    if (!server) return;
    const svcConfig = buildServiceConfig();
    if (!svcConfig.localUrl) {
      alert('Error', 'Local URL is required');
      return;
    }

    const updatedServices = server.services.map((s) =>
      s.serviceId === serviceId ? svcConfig : s,
    );

    updateServer({ ...server, services: updatedServices });
    clearAdapters();
    navigation.goBack();
  };

  const defaultPlaceholder = meta.urlSuffix
    ? `http://192.168.1.100:${meta.defaultPort}${meta.urlSuffix}`
    : `http://192.168.1.100:${meta.defaultPort}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.headerIcon, { backgroundColor: cfg.color }]}>
        <Text style={styles.headerIconText}>{cfg.icon}</Text>
      </View>
      <Text style={styles.headerTitle}>{cfg.label}</Text>

      {/* URL */}
      <Text style={styles.label}>Local URL *</Text>
      <TextInput
        style={styles.input}
        value={localUrl}
        onChangeText={(t) => { setLocalUrl(t); setTestResult('none'); }}
        placeholder={defaultPlaceholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={styles.label}>Remote URL (optional — falls back to local)</Text>
      <TextInput
        style={styles.input}
        value={remoteUrl}
        onChangeText={(t) => { setRemoteUrl(t); setTestResult('none'); }}
        placeholder={`https://${serviceId}.example.com`}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      {/* Auth — API key OR username/password depending on service */}
      {usesApiKey ? (
        <>
          <Text style={styles.label}>API Key *</Text>
          <Text style={styles.hint}>{meta.authHint}</Text>
          <View style={styles.secretRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={apiKey}
              onChangeText={(t) => { setApiKey(t); setTestResult('none'); }}
              placeholder="Paste your API key here"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showSecret}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.showBtn} onPress={() => setShowSecret(!showSecret)}>
              <Text style={styles.showToggle}>{showSecret ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>Authentication</Text>
          <Text style={styles.hint}>{meta.authHint}</Text>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(t) => { setUsername(t); setTestResult('none'); }}
            placeholder="Username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.secretRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={(t) => { setPassword(t); setTestResult('none'); }}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showSecret}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.showBtn} onPress={() => setShowSecret(!showSecret)}>
              <Text style={styles.showToggle}>{showSecret ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Test + Save */}
      <Pressable style={styles.testButton} onPress={testConnection}>
        <Text style={styles.testButtonText}>{testResult === 'testing' ? 'Testing...' : 'Test Connection'}</Text>
      </Pressable>
      {testResult === 'success' && <Text style={styles.testSuccess}>✓ Connection successful</Text>}
      {testResult === 'fail' && <Text style={styles.testFail}>✕ Connection failed{testError ? `\n${testError}` : ''}</Text>}

      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>

      {/* Advanced — collapsed by default */}
      <Pressable style={styles.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
        <Text style={styles.advancedToggleText}>{showAdvanced ? '▾ Hide Advanced' : '▸ Advanced Options'}</Text>
      </Pressable>

      {showAdvanced && (
        <View style={styles.advancedSection}>
          <Text style={styles.label}>Base Path (for reverse proxy subpaths)</Text>
          <TextInput style={styles.input} value={basePath} onChangeText={setBasePath} placeholder={`/${serviceId}`} placeholderTextColor={colors.textMuted} autoCapitalize="none" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Ignore SSL Certificate Errors</Text>
            <Switch value={sslIgnoreCert} onValueChange={setSslIgnoreCert} trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} thumbColor="#fff" />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { padding: spacing.xl, paddingBottom: 100 },
  headerIcon: { width: 56, height: 56, borderRadius: radii.lg, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.md, marginTop: spacing.md },
  headerIconText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  headerTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg },
  label: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs, marginTop: spacing.lg },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, fontStyle: 'italic' },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md },
  secretRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  showBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  showToggle: { ...typography.caption, color: colors.primary },
  testButton: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xxl },
  testButtonText: { ...typography.bodyBold, color: colors.primary },
  testSuccess: { ...typography.caption, color: colors.success, textAlign: 'center', marginTop: spacing.sm },
  testFail: { ...typography.caption, color: colors.error, textAlign: 'center', marginTop: spacing.sm },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  saveButtonText: { ...typography.bodyBold, color: '#0f1023' },
  advancedToggle: { marginTop: spacing.xxl, paddingVertical: spacing.md, alignItems: 'center' },
  advancedToggleText: { ...typography.caption, color: colors.textMuted, fontWeight: '500' },
  advancedSection: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: spacing.sm, paddingTop: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  switchLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
});
