import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchHomeScreen } from '../../services/prowlarr/screens/SearchHomeScreen';
import { colors } from '../../core/theme/tokens';
import { screenWithBackground, headerFade } from '../../core/components/AppBackground';

const Stack = createNativeStackNavigator();

export function SearchStack() {
  return (
    <Stack.Navigator screenLayout={screenWithBackground}
      screenOptions={{
        freezeOnBlur: true,
        headerTransparent: true,
        headerBackground: headerFade,
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="SearchHome"
        component={SearchHomeScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
