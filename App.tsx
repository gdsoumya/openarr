import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/core/theme/ThemeProvider';
import { TabNavigator } from './src/navigation/TabNavigator';
import { useServerStore } from './src/stores/serverStore';
import { colors } from './src/core/theme/tokens';

export default function App() {
  const loadFromStorage = useServerStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: colors.primary,
              background: colors.surfaceBase,
              card: colors.surfaceElevated,
              text: colors.textPrimary,
              border: colors.divider,
              notification: colors.error,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '900' },
            },
          }}
        >
          <StatusBar barStyle="light-content" backgroundColor={colors.surfaceBase} />
          <TabNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
