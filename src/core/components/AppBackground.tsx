import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '../../stores/settingsStore';
import { PosterWallBackground } from './PosterWallBackground';

// App-wide backdrop, style switchable in Settings → Appearance.
// "aurora": indigo-to-black wash with teal/violet glows.
// "posters": dimmed trending-poster collage under a heavy scrim.
export function AppBackground() {
  const style = useSettingsStore((s) => s.backgroundStyle);
  if (style === 'posters') return <PosterWallBackground />;
  return (
    <>
      <LinearGradient
        colors={['#171c40', '#0f1023', '#0a0b18']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(100,255,218,0.08)', 'transparent']}
        start={{ x: 1, y: 0 }} end={{ x: 0.25, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(168,85,247,0.06)']}
        start={{ x: 1, y: 0.4 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}
