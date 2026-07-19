import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSettingsStore } from '../../stores/settingsStore';
import { PosterWallBackground } from './PosterWallBackground';

// App-wide backdrop, style switchable in Settings → Appearance.
// "aurora": indigo-to-black wash with teal/violet glows.
// "posters": dimmed trending-poster collage under a heavy scrim.
export const AppBackground = React.memo(function AppBackground({ wallEligible = true }: { wallEligible?: boolean }) {
  const style = useSettingsStore((s) => s.backgroundStyle);
  if (style === 'posters' && wallEligible) return <PosterWallBackground />;
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
});

// Screens where the poster wall shows; pushed detail/config screens use the
// cheap gradient — a wall per mounted screen would pile up hundreds of images
const WALL_SCREENS = new Set([
  'SummaryHome', 'TorrentList', 'TVHome', 'MoviesHome', 'SearchHome',
  'SubsHome', 'InfraHome', 'Dashboard',
]);

// screenLayout wrapper: gives every stack screen an opaque layer with the
// gradient inside it, so screens never see through to the one below during
// native-stack transitions.
// Headers are transparent (see stack screenOptions) so the background flows
// behind them; content pads down by the header height to compensate.
function ScreenBackgroundLayout({ children, route, options }: {
  children: React.ReactElement; route?: { name?: string }; options?: { headerShown?: boolean };
}) {
  const headerShown = options?.headerShown !== false;
  const headerHeight = useHeaderHeight();
  return (
    <View style={styles.screen}>
      <AppBackground wallEligible={!!route?.name && WALL_SCREENS.has(route.name)} />
      <View style={{ flex: 1, paddingTop: headerShown ? headerHeight : 0 }}>{children}</View>
    </View>
  );
}

export function screenWithBackground(props: any) {
  return <ScreenBackgroundLayout {...props} />;
}

// Soft fade behind transparent native headers — keeps titles legible while
// the page background shows through underneath
export function headerFade() {
  return (
    <LinearGradient
      colors={['rgba(10,11,24,0.92)', 'rgba(10,11,24,0.55)', 'rgba(10,11,24,0)']}
      locations={[0, 0.7, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1023' },
});
