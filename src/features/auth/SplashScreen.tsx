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
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
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
  orbOne: {
    position: 'absolute',
    top: 120,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: 'rgba(75, 65, 225, 0.1)',
  },
  orbTwo: {
    position: 'absolute',
    bottom: 100,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(0, 0, 11, 0.06)',
  },
});
