import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Input, ModalSheet, Stepper } from '@/components/ui';
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
  const { items, subtotal, discountAmount, total, setQuantity, removeItem, setDiscountAmount } = useCart();
  const [discountVisible, setDiscountVisible] = React.useState(false);
  const [discountMode, setDiscountMode] = React.useState<'amount' | 'percent'>('amount');
  const [discountDraft, setDiscountDraft] = React.useState(String(discountAmount || 0));
  const discountPercent = subtotal > 0 ? Math.min(100, Math.round((discountAmount / subtotal) * 100)) : 0;

  React.useEffect(() => {
    setDiscountDraft(String(discountAmount || 0));
  }, [discountAmount, visible]);

  function handleOpenDiscount() {
    setDiscountMode('amount');
    setDiscountDraft(String(discountAmount || 0));
    setDiscountVisible(true);
  }

  function handleChangeDiscountMode(nextMode: 'amount' | 'percent') {
    const currentValue = Math.max(0, Number(discountDraft || 0));
    if (nextMode === discountMode) {
      return;
    }

    if (nextMode === 'percent') {
      setDiscountDraft(subtotal > 0 ? String(Math.round((currentValue / subtotal) * 100)) : '0');
    } else {
      setDiscountDraft(subtotal > 0 ? String(Math.max(0, (subtotal * currentValue) / 100)) : '0');
    }

    setDiscountMode(nextMode);
  }

  function handleSaveDiscount() {
    const entered = Math.max(0, Number(discountDraft || 0));
    const value = discountMode === 'percent' ? Math.max(0, (subtotal * entered) / 100) : entered;
    setDiscountAmount(value);
    setDiscountVisible(false);
  }

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
              <View style={styles.itemRow}>
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
                  <Stepper
                    value={item.quantity}
                    decrementLabel={`Decrease ${item.name} quantity`}
                    incrementLabel={`Increase ${item.name} quantity`}
                    onDecrement={() => setQuantity(item.product_id, item.quantity - 1)}
                    onIncrement={() => setQuantity(item.product_id, item.quantity + 1)}
                  />
                  <Button
                    label="Remove"
                    variant="ghost"
                    accessibilityLabel={`Remove ${item.name}`}
                    onPress={() => removeItem(item.product_id)}
                    fullWidth={false}
                  />
                </View>
              </View>
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
            <Button
              label={discountAmount > 0 ? 'Edit discount' : 'Add discount'}
              variant="secondary"
              accessibilityLabel={discountAmount > 0 ? 'Edit discount' : 'Add discount'}
              onPress={handleOpenDiscount}
            />
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
          <Button
            label={`Checkout · ${formatCurrency(total)}`}
            accessibilityLabel="Checkout cart"
            onPress={() => {
              onClose();
              navigation.navigate('Checkout');
            }}
          />
        </>
      )}
      <ModalSheet visible={discountVisible} title="Add discount" onClose={() => setDiscountVisible(false)}>
        <View style={styles.discountSheet}>
          <Text style={styles.discountCopy}>Choose a fixed amount or a percentage of the current subtotal.</Text>
          <View style={styles.modeRow}>
            <Button
              label="Amount"
              variant={discountMode === 'amount' ? 'primary' : 'secondary'}
              accessibilityLabel="Set discount mode to amount"
              onPress={() => handleChangeDiscountMode('amount')}
              fullWidth={false}
            />
            <Button
              label="Percentage"
              variant={discountMode === 'percent' ? 'primary' : 'secondary'}
              accessibilityLabel="Set discount mode to percentage"
              onPress={() => handleChangeDiscountMode('percent')}
              fullWidth={false}
            />
          </View>
          <Input
            label={discountMode === 'percent' ? 'Discount percentage' : 'Discount amount'}
            accessibilityLabel={discountMode === 'percent' ? 'Discount percentage' : 'Discount amount'}
            value={discountDraft}
            onChangeText={setDiscountDraft}
            keyboardType="numeric"
            placeholder={discountMode === 'percent' ? '10' : '0'}
          />
          <Text style={styles.discountPreview}>
            {discountMode === 'percent'
              ? `This will apply ${discountDraft || '0'}% of ${formatCurrency(subtotal)}.`
              : `This will apply ${formatCurrency(Number(discountDraft || 0))} (${discountPercent}% of subtotal).`}
          </Text>
          <View style={styles.discountActions}>
            <Button
              label="Cancel"
              variant="ghost"
              accessibilityLabel="Cancel discount"
              onPress={() => setDiscountVisible(false)}
              fullWidth={false}
            />
            <Button label="Apply" accessibilityLabel="Apply discount" onPress={handleSaveDiscount} />
          </View>
        </View>
      </ModalSheet>
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
  itemRow: {
    gap: dimensions.sm,
    paddingVertical: dimensions.sm,
    borderBottomWidth: dimensions.cardBorderWidth,
    borderBottomColor: colors.border,
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
  discountSheet: {
    gap: dimensions.md,
  },
  discountCopy: {
    ...typography.body,
    color: colors.textMuted,
  },
  modeRow: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  discountPreview: {
    ...typography.caption,
    color: colors.textMuted,
  },
  discountActions: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
});
