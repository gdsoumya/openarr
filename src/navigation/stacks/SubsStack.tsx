import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SubsHomeScreen } from '../../services/bazarr/screens/SubsHomeScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function SubsStack() {
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
        name="SubsHome"
        component={SubsHomeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
