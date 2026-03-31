import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { HomeStack } from './stacks/HomeStack';
import { TorrentsStack } from './stacks/TorrentsStack';
import { TVStack } from './stacks/TVStack';
import { MoviesStack } from './stacks/MoviesStack';
import { SearchStack } from './stacks/SearchStack';
import { SubsStack } from './stacks/SubsStack';
import { colors, typography } from '../core/theme/tokens';
import { useConnectionStore } from '../stores/connectionStore';

const Tab = createBottomTabNavigator();

const tabIconMap: Record<string, { lib: 'mci' | 'ion'; name: string }> = {
  Home: { lib: 'mci', name: 'view-dashboard' },
  Torrents: { lib: 'mci', name: 'download' },
  TV: { lib: 'mci', name: 'television-classic' },
  Movies: { lib: 'mci', name: 'movie-open' },
  Search: { lib: 'ion', name: 'search' },
  Subs: { lib: 'mci', name: 'subtitles' },
};

export function TabNavigator() {
  const subsBadge = useConnectionStore((s) => s.subsBadgeCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 16, 35, 0.95)',
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...typography.badge, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const cfg = tabIconMap[route.name];
          const size = 24;
          if (cfg?.lib === 'ion') return <Ionicons name={cfg.name as any} size={size} color={color} />;
          return <MaterialCommunityIcons name={cfg?.name as any ?? 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Torrents" component={TorrentsStack} />
      <Tab.Screen name="TV" component={TVStack} />
      <Tab.Screen name="Movies" component={MoviesStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Subs" component={SubsStack}
        options={{
          tabBarBadge: subsBadge > 0 ? subsBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.error, fontSize: 10, fontWeight: '700' },
        }} />
    </Tab.Navigator>
  );
}
