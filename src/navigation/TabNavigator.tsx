import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TorrentsStack } from './stacks/TorrentsStack';
import { SummaryStack } from './stacks/SummaryStack';
import { TVStack } from './stacks/TVStack';
import { MoviesStack } from './stacks/MoviesStack';
import { SearchStack } from './stacks/SearchStack';
import { SubsStack } from './stacks/SubsStack';
import { InfraStack } from './stacks/InfraStack';
import { colors, typography } from '../core/theme/tokens';

const Tab = createBottomTabNavigator();

const tabIconMap: Record<string, { lib: 'mci' | 'ion'; name: string }> = {
  Home: { lib: 'mci', name: 'home-variant' },
  Torrents: { lib: 'mci', name: 'download' },
  TV: { lib: 'mci', name: 'television-classic' },
  Movies: { lib: 'mci', name: 'movie-open' },
  Search: { lib: 'ion', name: 'search' },
  Subs: { lib: 'mci', name: 'subtitles' },
  Infra: { lib: 'mci', name: 'server' },
};

// Each tab lights up in its service's color when active, nzb360-style
const tabAccentMap: Record<string, string> = {
  Home: colors.primary,
  Torrents: colors.transmission,
  TV: colors.sonarr,
  Movies: colors.radarr,
  Search: colors.prowlarr,
  Subs: colors.bazarr,
  Infra: colors.portainer,
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        // Inactive tabs are frozen so they can't re-render in the background
        freezeOnBlur: true,
        lazy: true,
        // Leaving a tab resets its stack, so returning always lands on its home screen
        popToTopOnBlur: true,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 16, 35, 0.95)',
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 56 + Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: tabAccentMap[route.name] ?? colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...typography.micro, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const cfg = tabIconMap[route.name];
          const size = 24;
          if (cfg?.lib === 'ion') return <Ionicons name={cfg.name as any} size={size} color={color} />;
          return <MaterialCommunityIcons name={cfg?.name as any ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={SummaryStack} listeners={({ navigation }) => ({ tabPress: () => navigation.navigate('Home', { screen: 'SummaryHome' }) })} />
      <Tab.Screen name="Torrents" component={TorrentsStack} listeners={({ navigation }) => ({ tabPress: () => navigation.navigate('Torrents', { screen: 'TorrentList' }) })} />
      <Tab.Screen name="TV" component={TVStack} listeners={({ navigation }) => ({ tabPress: () => navigation.navigate('TV', { screen: 'TVHome' }) })} />
      <Tab.Screen name="Movies" component={MoviesStack} listeners={({ navigation }) => ({ tabPress: () => navigation.navigate('Movies', { screen: 'MoviesHome' }) })} />
      <Tab.Screen name="Search" component={SearchStack} listeners={({ navigation }) => ({ tabPress: () => navigation.navigate('Search', { screen: 'SearchHome' }) })} />
      <Tab.Screen name="Subs" component={SubsStack}
        listeners={({ navigation }) => ({ tabPress: () => navigation.navigate('Subs', { screen: 'SubsHome' }) })}
      />
      <Tab.Screen name="Infra" component={InfraStack} listeners={({ navigation }) => ({ tabPress: () => navigation.navigate('Infra', { screen: 'InfraHome' }) })} />
    </Tab.Navigator>
  );
}
