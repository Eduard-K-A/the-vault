import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export default function SplashScreen() {
  const { phase, lastError } = useSyncStatus();

  const subtitle =
    phase === 'offline'
      ? 'Offline mode is active. The local cache is available.'
      : phase === 'syncing'
        ? 'Loading workspace and syncing with the backend.'
        : lastError ?? 'Loading workspace and syncing with the backend.';

  return (
    <View style={styles.container}>
      <BrandMark compact />
      <Text style={styles.title}>Preparing workspace</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: dimensions.md,
    paddingHorizontal: dimensions.screenPaddingH,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
