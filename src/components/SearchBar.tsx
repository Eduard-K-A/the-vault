import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useThemedStyles } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onScanPress?: () => void;
  onScanUnavailable?: (message: string) => void;
}

const scannerUnavailableMessage = 'Scanner is coming soon. Enter SKU or barcode manually.';

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onScanPress,
  onScanUnavailable,
}: SearchBarProps) {
  const styles = useThemedStyles(createStyles);
  const handleScanPress = onScanPress ?? (() => onScanUnavailable?.(scannerUnavailableMessage));
  const showScanner = Boolean(onScanPress || onScanUnavailable);

  return (
    <View style={styles.container}>
      <Text style={styles.searchIcon}>⌕</Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search products...'}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {showScanner ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
          onPress={handleScanPress}
          style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
        >
          <Text style={styles.scanLabel}>Scan</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
    minHeight: dimensions.inputHeight,
    borderRadius: dimensions.radiusLg,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingLeft: dimensions.md,
    paddingRight: dimensions.xs,
  },
  searchIcon: {
    color: c.textSecondary,
    ...typography.body,
  },
  input: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    minHeight: dimensions.inputHeight,
  },
  scanButton: {
    height: dimensions.chipHeight,
    paddingHorizontal: dimensions.sm,
    borderRadius: dimensions.radiusFull,
    backgroundColor: c.surface,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  scanButtonPressed: {
    opacity: 0.9,
  },
  scanLabel: {
    ...typography.body,
    color: c.textSecondary,
    fontWeight: '500',
  },
});
