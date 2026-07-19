import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  emby: 'play-circle-outline',
};

export function ServiceIcon({ serviceId, size = 44 }: ServiceIconProps) {
  const config = serviceConfig[serviceId];
  return (
    <LinearGradient
      colors={[config.color, `${config.color}99`]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.icon, {
        width: size, height: size, borderRadius: size * 0.27,
        shadowColor: config.color, shadowOpacity: 0.45, shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 }, elevation: 5,
      }]}
    >
      <MaterialCommunityIcons name={serviceIconMap[serviceId] as any ?? 'server'} size={size * 0.5} color="#fff" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  icon: { justifyContent: 'center', alignItems: 'center' },
});
