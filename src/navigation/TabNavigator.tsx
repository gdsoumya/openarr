import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStack } from './stacks/HomeStack';
import { TorrentsStack } from './stacks/TorrentsStack';
import { TVStack } from './stacks/TVStack';
import { MoviesStack } from './stacks/MoviesStack';
import { SearchStack } from './stacks/SearchStack';
import { SubsStack } from './stacks/SubsStack';
import { colors, typography } from '../core/theme/tokens';
import { useConnectionStore } from '../stores/connectionStore';

const Tab = createBottomTabNavigator();

const tabIcons: Record<string, string> = {
  Home: '🏠',
  Torrents: '⬇️',
  TV: '📺',
  Movies: '🎬',
  Search: '🔍',
  Subs: '💬',
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
          height: 80,
          paddingTop: 6,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...typography.badge, fontWeight: '600' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>
            {tabIcons[route.name] ?? '●'}
          </Text>
        ),
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
