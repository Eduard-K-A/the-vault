import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useThemedStyles } from '@/theme';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.markCircle}>
        <Text style={styles.mark}>V</Text>
      </View>
      {!compact ? <Text style={styles.label}>The Vault</Text> : null}
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  compact: {
    gap: 0,
  },
  markCircle: {
    width: 32,
    height: 32,
    borderRadius: dimensions.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
  },
  mark: {
    ...typography.label,
    color: c.onAccent,
    fontSize: 15,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  label: {
    ...typography.subtitle,
    color: c.text,
  },
});
