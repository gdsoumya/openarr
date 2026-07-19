import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ServerSetupScreen } from '../screens/ServerSetupScreen';
import { ServiceConfigScreen } from '../screens/ServiceConfigScreen';
import { useDownloadMonitor } from '../core/notifications/useDownloadMonitor';
import { colors } from '../core/theme/tokens';
import { screenWithBackground } from '../core/components/AppBackground';

const Stack = createNativeStackNavigator();

// Home/dashboard lives above the tabs so it's one tap away from any screen
// (via the DashboardButton in each tab's header) without costing a tab slot.
export function RootStack() {
  useDownloadMonitor();
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
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ServerSetup" component={ServerSetupScreen} options={{ title: 'Server Setup' }} />
      <Stack.Screen name="ServiceConfig" component={ServiceConfigScreen} options={{ title: 'Service Config' }} />
    </Stack.Navigator>
  );
}
