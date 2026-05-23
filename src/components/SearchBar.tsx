import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onScanPress?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder, onScanPress }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search products, SKU, or barcode'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {onScanPress ? (
        <Pressable onPress={onScanPress} style={styles.scanButton}>
          <Text style={styles.scanLabel}>Scan</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: dimensions.sm,
  },
  scanButton: {
    height: 48,
    paddingHorizontal: dimensions.md,
    borderRadius: dimensions.radiusMd,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
});

