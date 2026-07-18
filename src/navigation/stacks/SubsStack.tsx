import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SubsHomeScreen } from '../../services/bazarr/screens/SubsHomeScreen';
import { SeriesSubtitlesScreen } from '../../services/bazarr/screens/SeriesSubtitlesScreen';
import { MovieSubtitlesScreen } from '../../services/bazarr/screens/MovieSubtitlesScreen';
import { colors } from '../../core/theme/tokens';

const Stack = createNativeStackNavigator();

export function SubsStack() {
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
      <Stack.Screen
        name="SubsHome"
        component={SubsHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SubsSeriesDetail"
        component={SeriesSubtitlesScreen}
        options={({ route }: any) => ({ title: route.params?.title ?? 'Series Subtitles' })}
      />
      <Stack.Screen
        name="SubsMovieDetail"
        component={MovieSubtitlesScreen}
        options={({ route }: any) => ({ title: route.params?.title ?? 'Movie Subtitles' })}
      />
    </Stack.Navigator>
  );
}
