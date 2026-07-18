import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TVHomeScreen } from '../../services/sonarr/screens/TVHomeScreen';
import { SeriesDetailScreen } from '../../services/sonarr/screens/SeriesDetailScreen';
import { DiscoveryDetailScreen } from '../../screens/DiscoveryDetailScreen';
import { DiscoverBrowseScreen } from '../../screens/discover/DiscoverBrowseScreen';
import { PersonScreen } from '../../screens/discover/PersonScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function TVStack() {
  return (
    <Stack.Navigator screenOptions={{ freezeOnBlur: true, headerStyle: { backgroundColor: colors.surfaceBase }, headerTintColor: colors.textPrimary, headerShadowVisible: false, contentStyle: { backgroundColor: colors.surfaceBase } }}>
      <Stack.Screen name="TVHome" component={TVHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DiscoveryDetail" component={DiscoveryDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DiscoverBrowse" component={DiscoverBrowseScreen} options={({ route }: any) => ({ title: route.params?.title ?? 'Discover' })} />
      <Stack.Screen name="Person" component={PersonScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
