import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ServiceId, serviceConfig } from '../theme/tokens';

interface ServiceIconProps {
  serviceId: ServiceId;
  size?: number;
}

export function ServiceIcon({ serviceId, size = 44 }: ServiceIconProps) {
  const config = serviceConfig[serviceId];
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size * 0.27, backgroundColor: config.color }]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{config.icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
