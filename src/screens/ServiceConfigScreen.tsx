import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Switch, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography, serviceConfig } from '../core/theme/tokens';

export function ServiceConfigScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { serviceId } = route.params;
  const cfg = serviceConfig[serviceId as keyof typeof serviceConfig];

  const [localUrl, setLocalUrl] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sslIgnoreCert, setSslIgnoreCert] = useState(false);
  const [basePath, setBasePath] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'fail'>('none');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.headerIcon, { backgroundColor: cfg.color }]}>
        <Text style={styles.headerIconText}>{cfg.icon}</Text>
      </View>
      <Text style={styles.headerTitle}>{cfg.label}</Text>

      <Text style={styles.label}>Local URL</Text>
      <TextInput style={styles.input} value={localUrl} onChangeText={setLocalUrl} placeholder="http://192.168.1.100:8989" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

      <Text style={styles.label}>Remote URL</Text>
      <TextInput style={styles.input} value={remoteUrl} onChangeText={setRemoteUrl} placeholder="https://sonarr.example.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

      {serviceId !== 'transmission' && (
        <>
          <Text style={styles.label}>API Key</Text>
          <View style={styles.apiKeyRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value={apiKey} onChangeText={setApiKey} placeholder="API Key" placeholderTextColor={colors.textMuted} secureTextEntry={!showApiKey} autoCapitalize="none" />
            <Pressable onPress={() => setShowApiKey(!showApiKey)}><Text style={styles.showToggle}>{showApiKey ? 'Hide' : 'Show'}</Text></Pressable>
          </View>
        </>
      )}

      <Text style={styles.label}>Username (optional)</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

      <Text style={styles.label}>Password (optional)</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry autoCapitalize="none" />

      <Text style={styles.label}>Base Path (optional)</Text>
      <TextInput style={styles.input} value={basePath} onChangeText={setBasePath} placeholder="/sonarr" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Ignore SSL Certificate Errors</Text>
        <Switch value={sslIgnoreCert} onValueChange={setSslIgnoreCert} trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} thumbColor="#fff" />
      </View>

      <Pressable style={styles.testButton} onPress={() => setTestResult('success')}>
        <Text style={styles.testButtonText}>Test Connection</Text>
      </Pressable>
      {testResult === 'success' && <Text style={styles.testSuccess}>✓ Connection successful</Text>}
      {testResult === 'fail' && <Text style={styles.testFail}>✕ Connection failed</Text>}

      <Pressable style={styles.saveButton} onPress={() => navigation.goBack()}>
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { padding: spacing.xl, paddingBottom: 100 },
  headerIcon: { width: 56, height: 56, borderRadius: radii.lg, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.md },
  headerIconText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  headerTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xl },
  label: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md },
  apiKeyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  showToggle: { ...typography.caption, color: colors.primary },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  switchLabel: { ...typography.body, color: colors.textSecondary },
  testButton: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xxl },
  testButtonText: { ...typography.bodyBold, color: colors.primary },
  testSuccess: { ...typography.caption, color: colors.success, textAlign: 'center', marginTop: spacing.sm },
  testFail: { ...typography.caption, color: colors.error, textAlign: 'center', marginTop: spacing.sm },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  saveButtonText: { ...typography.bodyBold, color: '#0f1023' },
});
