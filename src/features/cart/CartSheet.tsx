import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, ModalSheet } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
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
        <Text style={styles.empty}>Your cart is empty.</Text>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.product_id}
            ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta}>
                    {item.quantity} x {item.selling_price.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <Button label="-" variant="secondary" onPress={() => setQuantity(item.product_id, item.quantity - 1)} fullWidth={false} />
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <Button label="+" variant="secondary" onPress={() => setQuantity(item.product_id, item.quantity + 1)} fullWidth={false} />
                  <Button label="Remove" variant="ghost" onPress={() => removeItem(item.product_id)} fullWidth={false} />
                </View>
              </View>
            )}
          />
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>{discountAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{total.toFixed(2)}</Text>
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
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: dimensions.sm,
    alignItems: 'center',
    paddingVertical: dimensions.xs,
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
  rowActions: {
    flexDirection: 'row',
    gap: dimensions.xs,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  quantity: {
    ...typography.subtitle,
    color: colors.text,
    minWidth: 20,
    textAlign: 'center',
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
