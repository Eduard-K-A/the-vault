import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
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
  const isLowStock = typeof stockQuantity === 'number' && stockQuantity <= 5;
  const isOutOfStock = typeof stockQuantity === 'number' && stockQuantity <= 0;

  return (
    <Pressable onPress={() => onPress?.(product)} style={styles.pressable}>
      <Card style={[styles.card, isOutOfStock && styles.cardOut, isLowStock && styles.cardLow]}>
        <View style={styles.media}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageLetter}>{product.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.content}>
          <View style={styles.headlineRow}>
            <View style={styles.titleBlock}>
              <Text style={[styles.name, !product.is_active && styles.nameMuted]} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {product.sku ?? 'No SKU'}
                {product.barcode ? ` · ${product.barcode}` : ''}
              </Text>
            </View>
            <Text style={styles.price}>{formatCurrency(product.selling_price)}</Text>
          </View>
          <View style={styles.footer}>
            <Badge
              label={product.is_active ? (isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock') : 'Archived'}
              tone={product.is_active ? (isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success') : 'neutral'}
            />
            {typeof stockQuantity === 'number' ? <Text style={styles.stock}>{stockQuantity} units</Text> : null}
          </View>
        </View>
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>{onAdd || onEdit ? '+' : '›'}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.md,
    minHeight: 96,
    padding: dimensions.md,
    borderRadius: dimensions.radiusMd,
  },
  cardLow: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  cardOut: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  media: {
    width: 56,
    height: 56,
    borderRadius: dimensions.radiusMd,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  imageLetter: {
    ...typography.subtitle,
    color: colors.accent,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: dimensions.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  nameMuted: {
    color: colors.textMuted,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  price: {
    ...typography.subtitle,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    minWidth: 88,
    textAlign: 'right',
  },
  stock: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  chevron: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
});
