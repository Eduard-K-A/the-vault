import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { Product } from '@/types/models';
import { formatCurrency } from '@/utils/formatCurrency';

interface ProductCardProps {
  product: Product;
  stockQuantity?: number;
  onPress?: (product: Product) => void;
  onAdd?: (product: Product) => void;
  onEdit?: (product: Product) => void;
}

export function ProductCard({ product, stockQuantity, onPress, onAdd, onEdit }: ProductCardProps) {
  return (
    <Pressable onPress={() => onPress?.(product)}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.imagePlaceholder}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.image} />
            ) : (
              <Text style={styles.imageLetter}>{product.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1, gap: dimensions.xs }}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.meta}>
              {product.sku ?? 'No SKU'} {product.barcode ? `• ${product.barcode}` : ''}
            </Text>
            <Text style={styles.price}>{formatCurrency(product.selling_price)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: dimensions.xs }}>
            <Badge
              label={product.is_active ? 'Active' : 'Archived'}
              tone={product.is_active ? 'success' : 'neutral'}
            />
            {typeof stockQuantity === 'number' ? (
              <Text style={styles.stock}>{stockQuantity} left</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          {onAdd ? <Button label="Add" onPress={() => onAdd(product)} fullWidth={false} /> : null}
          {onEdit ? <Button label="Edit" variant="secondary" onPress={() => onEdit(product)} fullWidth={false} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.md,
  },
  row: {
    flexDirection: 'row',
    gap: dimensions.md,
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: dimensions.radiusMd,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLetter: {
    ...typography.subtitle,
    color: colors.primary,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  price: {
    ...typography.body,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  stock: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
});

