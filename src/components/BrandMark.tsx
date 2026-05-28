import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.markCircle}>
        <Text style={styles.mark}>Z</Text>
      </View>
      {!compact ? <Text style={styles.label}>POSly</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  compact: {
    gap: 0,
  },
  markCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  mark: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
  },
  label: {
    ...typography.subtitle,
    color: colors.text,
  },
});
