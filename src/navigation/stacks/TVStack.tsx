import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TVHomeScreen } from '../../services/sonarr/screens/TVHomeScreen';
import { SeriesDetailScreen } from '../../services/sonarr/screens/SeriesDetailScreen';
import { DiscoveryDetailScreen } from '../../screens/DiscoveryDetailScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function TVStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surfaceBase }, headerTintColor: colors.textPrimary, headerShadowVisible: false, contentStyle: { backgroundColor: colors.surfaceBase } }}>
      <Stack.Screen name="TVHome" component={TVHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DiscoveryDetail" component={DiscoveryDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
