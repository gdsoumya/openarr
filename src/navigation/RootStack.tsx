import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ServerSetupScreen } from '../screens/ServerSetupScreen';
import { ServiceConfigScreen } from '../screens/ServiceConfigScreen';
import { colors } from '../core/theme/tokens';

const Stack = createNativeStackNavigator();

// Home/dashboard lives above the tabs so it's one tap away from any screen
// (via the DashboardButton in each tab's header) without costing a tab slot.
export function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        freezeOnBlur: true,
        headerStyle: { backgroundColor: colors.surfaceBase },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.surfaceBase },
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
