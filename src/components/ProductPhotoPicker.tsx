import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useThemedStyles } from '@/theme';
import { pickProductImage, removePersistedImage, type ImageSource } from '@/services/productImage.service';

interface ProductPhotoPickerProps {
  value: string | null;
  onChange: (uri: string | null) => void;
}

export function ProductPhotoPicker({ value, onChange }: ProductPhotoPickerProps) {
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState<ImageSource | null>(null);

  async function handlePick(source: ImageSource) {
    if (loading) {
      return;
    }

    try {
      setLoading(source);
      const uri = await pickProductImage(source);
      if (uri) {
        if (value) {
          removePersistedImage(value);
        }
        onChange(uri);
      }
    } catch (error) {
      Alert.alert('Photo unavailable', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  }

  function handleRemove() {
    if (value) {
      removePersistedImage(value);
    }
    onChange(null);
  }

  return (
    <Card style={styles.card}>
      {value ? (
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>▧</Text>
          <Text style={styles.title}>Product photo</Text>
        </View>
      )}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            label="Choose photo"
            variant="secondary"
            loading={loading === 'library'}
            onPress={() => handlePick('library')}
          />
        </View>
        <View style={styles.action}>
          <Button
            label="Take photo"
            variant="secondary"
            loading={loading === 'camera'}
            onPress={() => handlePick('camera')}
          />
        </View>
      </View>
      {value ? <Button label="Remove photo" variant="ghost" onPress={handleRemove} /> : null}
    </Card>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    gap: dimensions.sm,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  placeholder: {
    height: 180,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
  },
  icon: {
    ...typography.title,
    color: colors.textSecondary,
    opacity: 0.5,
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  action: {
    flex: 1,
    minWidth: 0,
  },
});
