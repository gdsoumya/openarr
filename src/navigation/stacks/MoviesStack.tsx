import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoviesHomeScreen } from '../../services/radarr/screens/MoviesHomeScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function MoviesStack() {
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
        name="MoviesHome"
        component={MoviesHomeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
