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
  const statusTone = product.is_active ? (isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success') : 'neutral';
  const statusLabel = product.is_active ? (isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock') : 'Archived';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name} product card`}
      onPress={() => onPress?.(product)}
      style={styles.pressable}
    >
      <Card padded={false} style={[styles.card, isOutOfStock && styles.cardOut]}>
        <View style={styles.media}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={[styles.image, isOutOfStock && styles.imageOut]} />
          ) : (
            <View accessibilityLabel="Product image placeholder" style={styles.imageFallback}>
              <Text style={styles.imageIcon}>▧</Text>
            </View>
          )}
          <View style={styles.stockBadge}>
            <Badge label={statusLabel} tone={statusTone} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.name, !product.is_active && styles.nameMuted]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {product.sku ?? 'No SKU'}
            {product.barcode ? ` · ${product.barcode}` : ''}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.price}>{formatCurrency(product.selling_price)}</Text>
            <View style={styles.actions}>
              {onEdit ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${product.name}`}
                  hitSlop={8}
                  onPress={(event) => {
                    event.stopPropagation();
                    onEdit(product);
                  }}
                  style={({ pressed }) => [styles.editButton, pressed && styles.actionButtonPressed]}
                >
                  <Text style={styles.actionLabel}>Edit</Text>
                </Pressable>
              ) : null}
              {onAdd && !isOutOfStock ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${product.name}`}
                  hitSlop={8}
                  onPress={(event) => {
                    event.stopPropagation();
                    onAdd(product);
                  }}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                >
                  <Text style={styles.actionButtonText}>＋</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
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
    minHeight: 220,
    borderRadius: dimensions.radiusXl,
    backgroundColor: colors.surface,
  },
  cardOut: {
    opacity: 0.82,
  },
  media: {
    height: 132,
    borderTopLeftRadius: dimensions.radiusXl,
    borderTopRightRadius: dimensions.radiusXl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOut: {
    opacity: 0.4,
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  imageIcon: {
    ...typography.subtitle,
    color: colors.textSecondary,
    opacity: 0.65,
  },
  stockBadge: {
    position: 'absolute',
    top: dimensions.xs,
    right: dimensions.xs,
  },
  content: {
    padding: dimensions.sm,
    gap: dimensions.xxs,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.text,
    minHeight: 40,
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
    marginTop: dimensions.xs,
  },
  price: {
    ...typography.price,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: colors.chipActiveText,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
  },
  actionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  editButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dimensions.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
});
