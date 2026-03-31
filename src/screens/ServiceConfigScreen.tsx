import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Switch, Pressable, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography, serviceConfig, ServiceId } from '../core/theme/tokens';
import { useServerStore } from '../stores/serverStore';
import { useConnectionStore } from '../stores/connectionStore';
import { getAdapter, clearAdapters } from '../services/adapterFactory';

const SERVICE_HINTS: Record<ServiceId, { defaultPort: string; apiKeyHint: string }> = {
  transmission: { defaultPort: '9091', apiKeyHint: 'Settings → Web → Authentication (if enabled)' },
  sonarr: { defaultPort: '8989', apiKeyHint: 'Settings → General → API Key' },
  radarr: { defaultPort: '7878', apiKeyHint: 'Settings → General → API Key' },
  prowlarr: { defaultPort: '9696', apiKeyHint: 'Settings → General → API Key' },
  bazarr: { defaultPort: '6767', apiKeyHint: 'Settings → General → API Key' },
};

export function ServiceConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { serverId, serviceId } = route.params as { serverId: string; serviceId: ServiceId };
  const cfg = serviceConfig[serviceId];
  const hints = SERVICE_HINTS[serviceId];

  const server = useServerStore((s) => s.servers.find((srv) => srv.id === serverId));
  const updateServer = useServerStore((s) => s.updateServer);
  const isLocal = useConnectionStore((s) => s.isLocal);

  const existing = server?.services.find((s) => s.serviceId === serviceId);

  const [localUrl, setLocalUrl] = useState(existing?.localUrl ?? '');
  const [remoteUrl, setRemoteUrl] = useState(existing?.remoteUrl ?? '');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [sslIgnoreCert, setSslIgnoreCert] = useState(existing?.sslIgnoreCert ?? false);
  const [basePath, setBasePath] = useState(existing?.basePath ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [username, setUsername] = useState(existing?.username ?? '');
  const [password, setPassword] = useState(existing?.password ?? '');
  const [testResult, setTestResult] = useState<'none' | 'testing' | 'success' | 'fail'>('none');

  const buildServiceConfig = () => ({
    serviceId,
    enabled: true,
    localUrl: localUrl.trim(),
    remoteUrl: remoteUrl.trim() || localUrl.trim(),
    apiKey: apiKey.trim() || undefined,
    username: username.trim() || undefined,
    password: password.trim() || undefined,
    sslIgnoreCert,
    basePath: basePath.trim() || undefined,
  });

  const testConnection = async () => {
    const svcConfig = buildServiceConfig();
    if (!svcConfig.localUrl && !svcConfig.remoteUrl) {
      Alert.alert('Error', 'Enter at least a Local URL');
      return;
    }
    setTestResult('testing');
    try {
      clearAdapters();
      const adapter = getAdapter(svcConfig, isLocal);
      const ok = await adapter.testConnection();
      setTestResult(ok ? 'success' : 'fail');
    } catch {
      setTestResult('fail');
    }
  };

  const save = () => {
    if (!server) return;
    const svcConfig = buildServiceConfig();
    if (!svcConfig.localUrl) {
      Alert.alert('Error', 'Local URL is required');
      return;
    }

    const updatedServices = server.services.map((s) =>
      s.serviceId === serviceId ? svcConfig : s,
    );

    updateServer({ ...server, services: updatedServices });
    clearAdapters();
    navigation.goBack();
  };

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
        placeholder={`http://192.168.1.100:${hints.defaultPort}`}
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

      {/* API Key — shown for ALL services */}
      <Text style={styles.label}>API Key *</Text>
      <Text style={styles.hint}>{hints.apiKeyHint}</Text>
      <View style={styles.apiKeyRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={apiKey}
          onChangeText={(t) => { setApiKey(t); setTestResult('none'); }}
          placeholder="Paste your API key here"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showApiKey}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.showBtn} onPress={() => setShowApiKey(!showApiKey)}>
          <Text style={styles.showToggle}>{showApiKey ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>

      {/* Test + Save */}
      <Pressable style={styles.testButton} onPress={testConnection}>
        <Text style={styles.testButtonText}>{testResult === 'testing' ? 'Testing...' : 'Test Connection'}</Text>
      </Pressable>
      {testResult === 'success' && <Text style={styles.testSuccess}>✓ Connection successful</Text>}
      {testResult === 'fail' && <Text style={styles.testFail}>✕ Connection failed — check URL and API key</Text>}

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

          <Text style={styles.label}>Username (HTTP basic auth)</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

          <Text style={styles.label}>Password (HTTP basic auth)</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry autoCapitalize="none" />

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
  apiKeyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
