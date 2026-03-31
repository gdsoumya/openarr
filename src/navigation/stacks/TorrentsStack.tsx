import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TorrentListScreen } from '../../services/transmission/screens/TorrentListScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function TorrentsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceBase },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.surfaceBase },
      }}
    >
      <Stack.Screen
        name="TorrentList"
        component={TorrentListScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
