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
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    Qty {item.quantity} x {item.selling_price.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <Button label="-" variant="secondary" onPress={() => setQuantity(item.product_id, item.quantity - 1)} fullWidth={false} />
                  <Button label="+" variant="secondary" onPress={() => setQuantity(item.product_id, item.quantity + 1)} fullWidth={false} />
                  <Button label="Remove" variant="ghost" onPress={() => removeItem(item.product_id)} fullWidth={false} />
                </View>
              </View>
            )}
          />
          <View style={styles.summary}>
            <Text style={styles.summaryLine}>Subtotal: {subtotal.toFixed(2)}</Text>
            <Text style={styles.summaryLine}>Discount: {discountAmount.toFixed(2)}</Text>
            <Text style={styles.summaryTotal}>Total: {total.toFixed(2)}</Text>
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
  rowActions: {
    flexDirection: 'row',
    gap: dimensions.xs,
    flexWrap: 'wrap',
  },
  summary: {
    gap: dimensions.xs,
    paddingTop: dimensions.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryLine: {
    ...typography.body,
    color: colors.textMuted,
  },
  summaryTotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
});

