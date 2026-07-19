import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography, serviceConfig, ServiceId } from '../core/theme/tokens';
import { useServerStore } from '../stores/serverStore';
import { ServiceIcon } from '../core/components/ServiceIcon';
import { ServerConfig, ServiceConfig as SvcConfig } from '../core/types/services';

export function ServerSetupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const paramServerId = route.params?.serverId;

  const servers = useServerStore((s) => s.servers);
  const addServer = useServerStore((s) => s.addServer);
  const updateServer = useServerStore((s) => s.updateServer);
  const removeServer = useServerStore((s) => s.removeServer);
  const setActiveServer = useServerStore((s) => s.setActiveServer);

  // For new servers, create an ID immediately so ServiceConfig can reference it
  const [serverId] = useState(() => paramServerId ?? Date.now().toString());
  const existingServer = servers.find((srv) => srv.id === serverId);

  const [name, setName] = useState(existingServer?.name ?? '');
  const [homeSSIDs, setHomeSSIDs] = useState(existingServer?.homeSSIDs.join(', ') ?? '');

  // Servers saved by older app versions may lack entries for newly added
  // services, append disabled defaults without touching existing entries.
  const withAllServices = (svcs: SvcConfig[]): SvcConfig[] => {
    const missing = (Object.keys(serviceConfig) as ServiceId[])
      .filter((id) => !svcs.some((s) => s.serviceId === id))
      .map((id) => ({ serviceId: id, enabled: false, localUrl: '', remoteUrl: '' }));
    return missing.length ? [...svcs, ...missing] : svcs;
  };

  const [services, setServices] = useState<SvcConfig[]>(withAllServices(existingServer?.services ?? []));

  // Re-read from store in case ServiceConfigScreen updated it
  const currentServer = useServerStore((s) => s.servers.find((srv) => srv.id === serverId));
  const displayServices = withAllServices(currentServer?.services ?? services);

  const toggleService = (serviceId: ServiceId) => {
    const updated = displayServices.map((s) =>
      s.serviceId === serviceId ? { ...s, enabled: !s.enabled } : s,
    );
    setServices(updated);

    // Persist immediately so ServiceConfigScreen can read it
    const server: ServerConfig = {
      id: serverId,
      name: name || 'My Server',
      services: updated,
      homeSSIDs: homeSSIDs.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (currentServer) {
      updateServer(server);
    } else {
      addServer(server);
      // Only claim the active slot when no working server exists, otherwise
      // exploring "Add Server" would silently switch the whole app over
      if (!useServerStore.getState().getActiveServer()) setActiveServer(serverId);
    }
  };

  const openServiceConfig = (serviceId: ServiceId) => {
    // Ensure server is saved before navigating
    const server: ServerConfig = {
      id: serverId,
      name: name || 'My Server',
      services: displayServices,
      homeSSIDs: homeSSIDs.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (currentServer) {
      updateServer(server);
    } else {
      addServer(server);
      setActiveServer(serverId);
    }

    navigation.navigate('ServiceConfig', { serverId, serviceId });
  };

  const save = () => {
    const server: ServerConfig = {
      id: serverId,
      name: name || 'My Server',
      services: displayServices,
      homeSSIDs: homeSSIDs.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (currentServer) {
      updateServer(server);
    } else {
      addServer(server);
      setActiveServer(serverId);
    }
    navigation.goBack();
  };

  const hasConfigured = (svc: SvcConfig) => !!svc.localUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.label}>Server Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="My Server" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Home WiFi SSIDs (comma separated)</Text>
      <TextInput style={styles.input} value={homeSSIDs} onChangeText={setHomeSSIDs} placeholder="MyWiFi, HomeNetwork" placeholderTextColor={colors.textMuted} />

      <Text style={[styles.label, { marginTop: spacing.xl }]}>Services</Text>
      <Text style={styles.hint}>Enable a service, then tap it to configure the URL and API key.</Text>

      {displayServices.map((svc) => {
        const cfg = serviceConfig[svc.serviceId];
        const configured = hasConfigured(svc);
        return (
          <Pressable
            key={svc.serviceId}
            style={[styles.serviceRow, svc.enabled && configured && styles.serviceRowConfigured]}
            onPress={() => { if (svc.enabled) openServiceConfig(svc.serviceId); }}
          >
            <ServiceIcon serviceId={svc.serviceId} size={36} />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceLabel}>{cfg.label}</Text>
              {svc.enabled && !configured && (
                <Text style={styles.serviceStatus}>⚠ Tap to configure</Text>
              )}
              {svc.enabled && configured && (
                <Text style={styles.serviceConfigured}>✓ {svc.localUrl}</Text>
              )}
            </View>
            <Switch
              value={svc.enabled}
              onValueChange={() => toggleService(svc.serviceId)}
              trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }}
              thumbColor="#fff"
            />
          </Pressable>
        );
      })}

      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>Done</Text>
      </Pressable>

      {paramServerId && (
        <Pressable style={styles.deleteButton} onPress={() => { removeServer(serverId); navigation.goBack(); }}>
          <Text style={styles.deleteButtonText}>Delete Server</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.xl, paddingBottom: 20 },
  label: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.lg },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.md, padding: spacing.md },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.sm },
  serviceRowConfigured: { borderColor: 'rgba(100, 255, 218, 0.15)' },
  serviceInfo: { flex: 1 },
  serviceLabel: { ...typography.bodyBold, color: colors.textPrimary },
  serviceStatus: { ...typography.micro, color: colors.warning, marginTop: 2 },
  serviceConfigured: { ...typography.micro, color: colors.success, marginTop: 2 },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xxl },
  saveButtonText: { ...typography.bodyBold, color: '#0f1023' },
  deleteButton: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  deleteButtonText: { ...typography.bodyBold, color: colors.error },
});
