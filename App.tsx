import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { RootNavigator } from './src/app/RootNavigator';
import { hydrateSession } from './src/services/auth.service';
import { useAuthStore } from './src/store/authStore';
import { colors } from './src/constants/colors';

export default function App() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    void hydrateSession();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style={status === 'signed_in' ? 'light' : 'dark'} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

