import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'OpenArr',
  slug: 'openarr',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'openarr',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.openarr.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'OpenArr needs location access to detect your WiFi network for automatic local/remote server switching.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#0f1023',
    },
    package: 'com.openarr.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    // Dropped from the SDK 55 Android config type but still honored by prebuild;
    // required for HTTP access to LAN services.
    ...({ usesCleartextTraffic: true } as object),
  },
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0f1023',
  },
  plugins: [
    ['expo-notifications', { icon: './assets/images/notification-icon.png', color: '#64ffda' }],
  ],
});
