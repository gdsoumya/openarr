import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/core/theme/ThemeProvider';
import { TabNavigator } from './src/navigation/TabNavigator';
import { useServerStore } from './src/stores/serverStore';
import { colors } from './src/core/theme/tokens';
import { Toast } from './src/core/components/Toast';
import { useToastStore } from './src/core/hooks/useToast';
import { ThemedAlertProvider } from './src/core/components/ThemedAlert';
import { ErrorBoundary } from './src/core/components/ErrorBoundary';
import { startConnectionMonitoring } from './src/core/network/connectionManager';

export default function App() {
  const loadFromStorage = useServerStore((s) => s.loadFromStorage);
  const toast = useToastStore();

  useEffect(() => {
    loadFromStorage();
    const stopMonitoring = startConnectionMonitoring(15000); // Check every 15s
    return () => stopMonitoring();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <ThemeProvider>
        <ThemedAlertProvider>
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
          <ErrorBoundary>
            <TabNavigator />
          </ErrorBoundary>
          <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={toast.hide} />
        </NavigationContainer>
        </ThemedAlertProvider>
      </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
