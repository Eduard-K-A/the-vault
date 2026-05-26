import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '@/hooks/useCart';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { PaymentMethod } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const paymentMethods: PaymentMethod[] = ['cash', 'card', 'gcash', 'others'];

export default function CheckoutScreen() {
  const navigation = useNavigation<Navigation>();
  const { items, subtotal, discountAmount, total, paymentMethod, setPaymentMethod, checkout } = useCart();
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);
      const saleId = await checkout();
      navigation.navigate('Receipt', { saleId });
    } catch (error) {
      Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Checkout" subtitle="All writes happen locally before sync." onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        <Card style={{ gap: dimensions.sm }}>
          <SectionHeader title={business?.name ?? 'No business selected'} subtitle={branch?.name ?? 'No branch selected'} />
          <Badge label={`Items ${items.length}`} tone="primary" />
          {items.map((item) => (
            <View key={item.product_id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {formatCurrency(item.selling_price)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLine}>Subtotal {formatCurrency(subtotal)}</Text>
          <Text style={styles.summaryLine}>Discount {formatCurrency(discountAmount)}</Text>
          <Text style={styles.summaryTotal}>Total {formatCurrency(total)}</Text>
        </Card>

        <Card style={styles.paymentCard}>
          <SectionHeader title="Payment method" subtitle="Cashier chooses the tender type at checkout." />
          <View style={styles.paymentRow}>
            {paymentMethods.map((method) => (
              <Button
                key={method}
                label={method}
                variant={paymentMethod === method ? 'primary' : 'secondary'}
                onPress={() => setPaymentMethod(method)}
                fullWidth={false}
              />
            ))}
          </View>
        </Card>

        <Button label="Complete sale" onPress={handleCheckout} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  itemName: {
    color: colors.text,
    fontWeight: '700',
  },
  itemMeta: {
    color: colors.textMuted,
  },
  itemSubtotal: {
    color: colors.text,
    fontWeight: '700',
  },
  summaryCard: {
    gap: dimensions.xs,
  },
  summaryLine: {
    color: colors.textMuted,
  },
  summaryTotal: {
    color: colors.text,
    fontWeight: '700',
  },
  paymentCard: {
    gap: dimensions.md,
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
});
