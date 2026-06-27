import 'react-native-gesture-handler';

import React, { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { RootNavigator } from './src/app/RootNavigator';
import { hydrateSession } from './src/services/auth.service';
import { offlineConfig } from './src/config/offline';
import { initializeObservability } from './src/services/observability.service';
import { ThemeProvider, useTheme, useScheme } from './src/theme';
import { powersync } from './src/powersync';
import { PowerSyncContext } from '@powersync/react';

initializeObservability({
  appEnv: offlineConfig.appEnv,
  appVersion: offlineConfig.appVersion,
  remoteSinkConfigured: Boolean(offlineConfig.sentryDsn),
});

function ThemedApp() {
  const colors = useTheme();
  const scheme = useScheme();

  useEffect(() => {
    void hydrateSession();
  }, []);

  const navigationTheme = useMemo(
    () => ({
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    }),
    [colors, scheme],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <PowerSyncContext.Provider value={powersync}>
        <AppErrorBoundary>
          <NavigationContainer theme={navigationTheme}>
            <RootNavigator />
          </NavigationContainer>
        </AppErrorBoundary>
      </PowerSyncContext.Provider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
