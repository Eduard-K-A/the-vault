import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { StatusPill } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export default function SplashScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const { phase, lastError } = useSyncStatus();

  const status =
    phase === 'offline'
      ? { label: 'Offline', tone: 'warning' as const, message: 'Offline mode is active. Your local cache is ready to use.' }
      : phase === 'syncing'
        ? { label: 'Syncing', tone: 'accent' as const, message: 'Loading your workspace and syncing with the backend.' }
        : lastError
          ? { label: 'Retrying', tone: 'danger' as const, message: lastError }
          : { label: 'Connecting', tone: 'neutral' as const, message: 'Loading your workspace and syncing with the backend.' };

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <BrandMark compact />
        <Text style={styles.title}>Preparing workspace</Text>
        <Text style={styles.subtitle}>{status.message}</Text>
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      </View>
      <View style={styles.footer}>
        <StatusPill label={status.label} tone={status.tone} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dimensions.screenPaddingH,
    paddingVertical: dimensions.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: dimensions.md,
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
    maxWidth: 320,
  },
  spinner: {
    marginTop: dimensions.sm,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: dimensions.md,
  },
});
