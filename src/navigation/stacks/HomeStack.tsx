import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../../screens/DashboardScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { ServerSetupScreen } from '../../screens/ServerSetupScreen';
import { ServiceConfigScreen } from '../../screens/ServiceConfigScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ freezeOnBlur: true, headerStyle: { backgroundColor: colors.surfaceBase }, headerTintColor: colors.textPrimary, headerShadowVisible: false, contentStyle: { backgroundColor: colors.surfaceBase } }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ServerSetup" component={ServerSetupScreen} options={{ title: 'Server Setup' }} />
      <Stack.Screen name="ServiceConfig" component={ServiceConfigScreen} options={{ title: 'Service Config' }} />
    </Stack.Navigator>
  );
}
