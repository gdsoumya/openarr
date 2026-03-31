import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography, serviceConfig, ServiceId } from '../core/theme/tokens';
import { useServerStore } from '../stores/serverStore';
import { ServerConfig, ServiceConfig } from '../core/types/services';

export function ServerSetupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const serverId = route.params?.serverId;
  const existingServer = useServerStore((s) => s.servers.find(srv => srv.id === serverId));
  const addServer = useServerStore((s) => s.addServer);
  const updateServer = useServerStore((s) => s.updateServer);
  const removeServer = useServerStore((s) => s.removeServer);
  const setActiveServer = useServerStore((s) => s.setActiveServer);

  const [name, setName] = useState(existingServer?.name ?? '');
  const [services, setServices] = useState<ServiceConfig[]>(
    existingServer?.services ?? Object.keys(serviceConfig).map((id) => ({
      serviceId: id as ServiceId, enabled: false, localUrl: '', remoteUrl: '',
    })),
  );
  const [homeSSIDs, setHomeSSIDs] = useState(existingServer?.homeSSIDs.join(', ') ?? '');

  const toggleService = (serviceId: ServiceId) => {
    setServices(prev => prev.map(s => s.serviceId === serviceId ? { ...s, enabled: !s.enabled } : s));
  };

  const save = () => {
    const server: ServerConfig = {
      id: serverId ?? Date.now().toString(),
      name: name || 'My Server',
      services,
      homeSSIDs: homeSSIDs.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (serverId) updateServer(server);
    else { addServer(server); setActiveServer(server.id); }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Server Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="My Server" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Home WiFi SSIDs (comma separated)</Text>
      <TextInput style={styles.input} value={homeSSIDs} onChangeText={setHomeSSIDs} placeholder="MyWiFi, HomeNetwork" placeholderTextColor={colors.textMuted} />

      <Text style={[styles.label, { marginTop: spacing.xl }]}>Services</Text>
      {services.map((svc) => {
        const cfg = serviceConfig[svc.serviceId];
        return (
          <Pressable key={svc.serviceId} style={styles.serviceRow}
            onPress={() => { if (svc.enabled) navigation.navigate('ServiceConfig', { serverId: serverId ?? 'new', serviceId: svc.serviceId, services, setServices }); }}>
            <View style={[styles.serviceIcon, { backgroundColor: cfg.color }]}>
              <Text style={styles.serviceIconText}>{cfg.icon}</Text>
            </View>
            <Text style={styles.serviceLabel}>{cfg.label}</Text>
            <Switch value={svc.enabled} onValueChange={() => toggleService(svc.serviceId)}
              trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} thumbColor="#fff" />
          </Pressable>
        );
      })}

      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>{serverId ? 'Update Server' : 'Add Server'}</Text>
      </Pressable>

      {serverId && (
        <Pressable style={styles.deleteButton} onPress={() => { removeServer(serverId); navigation.goBack(); }}>
          <Text style={styles.deleteButtonText}>Delete Server</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  content: { padding: spacing.xl, paddingBottom: 100 },
  label: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.sm },
  serviceIcon: { width: 36, height: 36, borderRadius: radii.sm, justifyContent: 'center', alignItems: 'center' },
  serviceIconText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  serviceLabel: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xxl },
  saveButtonText: { ...typography.bodyBold, color: '#0f1023' },
  deleteButton: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  deleteButtonText: { ...typography.bodyBold, color: colors.error },
});
