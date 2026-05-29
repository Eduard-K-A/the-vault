import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, ModalSheet } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '@/hooks/useCart';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface CartSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function CartSheet({ visible, onClose }: CartSheetProps) {
  const navigation = useNavigation<Navigation>();
  const { items, subtotal, discountAmount, total, setQuantity, removeItem } = useCart();

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Cart">
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your cart is empty.</Text>
          <Text style={styles.empty}>Tap a product to start a sale, or scan a barcode to add items faster.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillLabel}>Items</Text>
              <Text style={styles.summaryPillValue}>{items.length}</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillLabel}>Total</Text>
              <Text style={styles.summaryPillValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.product_id}
            ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
            renderItem={({ item }) => (
              <Card style={styles.rowCard}>
                <View style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.name}
                    </Text>
                  <Text style={styles.meta}>
                      {item.quantity} x {formatCurrency(item.selling_price)}
                    </Text>
                  </View>
                  <Text style={styles.rowSubtotal}>{formatCurrency(item.subtotal)}</Text>
                </View>
                <View style={styles.rowActions}>
                  <View style={styles.stepper}>
                    <Pressable onPress={() => setQuantity(item.product_id, item.quantity - 1)} style={styles.stepperButton}>
                      <Text style={styles.stepperText}>−</Text>
                    </Pressable>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Pressable onPress={() => setQuantity(item.product_id, item.quantity + 1)} style={styles.stepperButton}>
                      <Text style={styles.stepperText}>+</Text>
                    </Pressable>
                  </View>
                  <Button label="Remove" variant="ghost" onPress={() => removeItem(item.product_id)} fullWidth={false} />
                </View>
              </Card>
            )}
          />
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>{formatCurrency(discountAmount)}</Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
          <Button
            label="Checkout"
            onPress={() => {
              onClose();
              navigation.navigate('Checkout');
            }}
          />
        </>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    gap: dimensions.xs,
    alignItems: 'center',
    paddingVertical: dimensions.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: 'center',
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  summaryPill: {
    flex: 1,
    borderRadius: dimensions.radiusMd,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryPillLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryPillValue: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: 2,
  },
  rowCard: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowSubtotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: dimensions.radiusFull,
    paddingHorizontal: dimensions.xs,
    paddingVertical: 4,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    ...typography.subtitle,
    color: colors.text,
    lineHeight: 20,
  },
  quantity: {
    ...typography.body,
    color: colors.text,
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '700',
  },
  summary: {
    gap: dimensions.xs,
    paddingTop: dimensions.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: dimensions.xs,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
  },
  summaryTotalLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  summaryTotalValue: {
    ...typography.subtitle,
    color: colors.accent,
  },
});
