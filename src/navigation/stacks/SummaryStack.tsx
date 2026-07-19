import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SummaryScreen } from '../../screens/SummaryScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function SummaryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        freezeOnBlur: true,
        headerStyle: { backgroundColor: colors.surfaceBase },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="SummaryHome" component={SummaryScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
