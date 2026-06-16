import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { RootNavigator } from './src/app/RootNavigator';
import { hydrateSession } from './src/services/auth.service';
import { offlineConfig } from './src/config/offline';
import { initializeObservability } from './src/services/observability.service';
import { useAuthStore } from './src/store/authStore';
import { colors } from './src/constants/colors';
import { powersync } from './src/powersync';
import { PowerSyncContext } from '@powersync/react';

initializeObservability({
  appEnv: offlineConfig.appEnv,
  appVersion: offlineConfig.appVersion,
  remoteSinkConfigured: Boolean(offlineConfig.sentryDsn),
});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function App() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    void hydrateSession();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <PowerSyncContext.Provider value={powersync}>
          <AppErrorBoundary>
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
          </AppErrorBoundary>
        </PowerSyncContext.Provider>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
