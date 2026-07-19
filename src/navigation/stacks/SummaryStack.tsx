import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SummaryScreen } from '../../screens/SummaryScreen';
import { colors } from '../../core/theme/tokens';
import { screenWithBackground } from '../../core/components/AppBackground';

const Stack = createNativeStackNavigator();

export function SummaryStack() {
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
      <Stack.Screen name="SummaryHome" component={SummaryScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
