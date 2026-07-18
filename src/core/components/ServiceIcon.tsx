import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ServiceId, serviceConfig } from '../theme/tokens';

interface ServiceIconProps {
  serviceId: ServiceId;
  size?: number;
}

const serviceIconMap: Record<string, string> = {
  transmission: 'swap-vertical',
  sonarr: 'television-classic',
  radarr: 'movie-open',
  prowlarr: 'magnify',
  bazarr: 'subtitles-outline',
  portainer: 'docker',
  gluetun: 'shield-lock',
};

export function ServiceIcon({ serviceId, size = 44 }: ServiceIconProps) {
  const config = serviceConfig[serviceId];
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size * 0.27, backgroundColor: config.color }]}>
      <MaterialCommunityIcons name={serviceIconMap[serviceId] as any ?? 'server'} size={size * 0.5} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { justifyContent: 'center', alignItems: 'center' },
});
