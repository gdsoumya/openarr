import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoviesHomeScreen } from '../../services/radarr/screens/MoviesHomeScreen';
import { MovieDetailScreen } from '../../services/radarr/screens/MovieDetailScreen';
import { DiscoveryDetailScreen } from '../../screens/DiscoveryDetailScreen';
import { DiscoverBrowseScreen } from '../../screens/discover/DiscoverBrowseScreen';
import { PersonScreen } from '../../screens/discover/PersonScreen';
import { DiscoverFiltersScreen } from '../../screens/discover/DiscoverFiltersScreen';
import { colors } from '../../core/theme/tokens';
import { screenWithBackground, headerFade } from '../../core/components/AppBackground';

const Stack = createNativeStackNavigator();

export function MoviesStack() {
  return (
    <Stack.Navigator screenLayout={screenWithBackground} screenOptions={{ freezeOnBlur: true, headerTransparent: true,
        headerBackground: headerFade, headerTintColor: colors.textPrimary, headerShadowVisible: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="MoviesHome" component={MoviesHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DiscoveryDetail" component={DiscoveryDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DiscoverBrowse" component={DiscoverBrowseScreen} options={({ route }: any) => ({ title: route.params?.title ?? 'Discover' })} />
      <Stack.Screen name="Person" component={PersonScreen} options={{ title: '' }} />
      <Stack.Screen name="DiscoverFilters" component={DiscoverFiltersScreen} options={{ title: 'Filters' }} />
    </Stack.Navigator>
  );
}
