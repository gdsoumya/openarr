import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InfraHomeScreen } from '../../screens/InfraHomeScreen';
import { ContainersScreen } from '../../services/portainer/screens/ContainersScreen';
import { ContainerDetailScreen } from '../../services/portainer/screens/ContainerDetailScreen';
import { ContainerLogsScreen } from '../../services/portainer/screens/ContainerLogsScreen';
import { StackDetailScreen } from '../../services/portainer/screens/StackDetailScreen';
import { LocationPickerScreen } from '../../services/gluetun/screens/LocationPickerScreen';
import { colors } from '../../core/theme/tokens';
import { screenWithBackground } from '../../core/components/AppBackground';

const Stack = createNativeStackNavigator();

export function InfraStack() {
  return (
    <Stack.Navigator screenLayout={screenWithBackground}
      screenOptions={{
        freezeOnBlur: true,
        headerStyle: { backgroundColor: colors.surfaceHeader },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="InfraHome" component={InfraHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Containers" component={ContainersScreen}
        options={({ route }: any) => ({ title: route.params?.endpointName ?? 'Containers' })} />
      <Stack.Screen name="ContainerDetail" component={ContainerDetailScreen}
        options={({ route }: any) => ({ title: route.params?.name ?? 'Container' })} />
      <Stack.Screen name="ContainerLogs" component={ContainerLogsScreen}
        options={({ route }: any) => ({ title: `${route.params?.name ?? 'Container'} · Logs` })} />
      <Stack.Screen name="StackDetail" component={StackDetailScreen}
        options={({ route }: any) => ({ title: route.params?.name ?? 'Stack' })} />
      <Stack.Screen name="GluetunLocationPicker" component={LocationPickerScreen}
        options={{ title: 'VPN Location' }} />
    </Stack.Navigator>
  );
}
