import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, PaymentChip, Screen, SectionHeader } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useCart } from '@/hooks/useCart';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { PaymentMethod } from '@/types/models';
import { formatCurrency } from '@/utils/formatCurrency';
import { generateUUID } from '@/utils/generateUUID';
import { createSyncTraceId, logCompleteSaleDebug } from '@/utils/syncDebug';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const paymentMethods: PaymentMethod[] = ['cash', 'gcash', 'maya', 'card'];

interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: string;
}

export default function CheckoutScreen() {
  const navigation = useNavigation<Navigation>();
  const role = useAuthStore((state) => state.role);
  const { items, subtotal, discountAmount, total, paymentMethod, checkout } = useCart();
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const [loading, setLoading] = useState(false);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: generateUUID(), method: paymentMethod, amount: total.toFixed(2) },
  ]);

  useEffect(() => {
    setPaymentLines([{ id: generateUUID(), method: paymentMethod, amount: total.toFixed(2) }]);
  }, [paymentMethod, total, items.length]);

  const receivedTotal = useMemo(
    () => paymentLines.reduce((sum, line) => sum + Math.max(0, Number(line.amount || 0)), 0),
    [paymentLines],
  );
  const changeDue = Math.max(0, receivedTotal - total);

  async function handleCheckout() {
    const checkoutTraceId = createSyncTraceId('button');
    logCompleteSaleDebug(checkoutTraceId, 'button pressed', {
      itemCount: items.length,
      businessId: business?.id ?? null,
      branchId: branch?.id ?? null,
      subtotal,
      discountAmount,
      total,
      receivedTotal,
      paymentLineCount: paymentLines.length,
      paymentMethods: paymentLines.map((line) => line.method),
    });

    if (receivedTotal < total) {
      logCompleteSaleDebug(checkoutTraceId, 'blocked: payment incomplete', {
        total,
        receivedTotal,
      });
      Alert.alert('Payment incomplete', 'The split payment rows must cover the full total.');
      return;
    }

    try {
      setLoading(true);
      logCompleteSaleDebug(checkoutTraceId, 'calling cart checkout');
      const saleId = await checkout(
        paymentLines[0]?.method,
        paymentLines.map((line) => ({
          method: line.method,
          amount_peso: Number(line.amount || 0),
        })),
        checkoutTraceId,
      );
      logCompleteSaleDebug(checkoutTraceId, 'checkout completed locally; navigating to receipt', { saleId });
      navigation.navigate('Receipt', { saleId });
    } catch (error) {
      logCompleteSaleDebug(checkoutTraceId, 'checkout failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
      logCompleteSaleDebug(checkoutTraceId, 'button process finished');
    }
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(role === 'owner' ? 'OwnerApp' : 'EmployeeApp');
  }

  return (
    <Screen title="Checkout" action={<SyncStatusBadge />} onBack={handleBack} scrollable contentStyle={styles.content}>
        <Card style={styles.summaryHero}>
          <Text style={styles.heroKicker}>{items.length} item{items.length === 1 ? '' : 's'}</Text>
          <Text style={styles.heroTotal}>{formatCurrency(total)}</Text>
        </Card>

        <Card style={styles.card}>
          <SectionHeader
            title={business?.name ?? 'No business selected'}
            subtitle={branch?.name ?? 'No branch selected'}
          />
          {items.map((item) => (
            <View key={item.product_id} style={styles.itemRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {formatCurrency(item.selling_price)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>How are they paying?</Text>
        <Card style={styles.paymentCard}>
          {paymentLines.map((line, index) => (
            <View key={line.id} style={styles.paymentLine}>
              <View style={styles.paymentLineHeader}>
                <Text style={styles.paymentLineLabel}>Payment {index + 1}</Text>
                {paymentLines.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove payment ${index + 1}`}
                    onPress={() => setPaymentLines((current) => current.filter((entry) => entry.id !== line.id))}
                  >
                    <Text style={styles.removePayment}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.paymentMethods}>
                {paymentMethods.map((method) => (
                  <PaymentChip
                    key={method}
                    accessibilityLabel={`Select ${method} payment for payment ${index + 1}`}
                    active={line.method === method}
                    glyph={method === 'cash' ? '▭' : method === 'card' ? '▤' : method === 'gcash' ? '◫' : '◪'}
                    label={method === 'gcash' ? 'GCash' : method === 'maya' ? 'Maya' : method[0].toUpperCase() + method.slice(1)}
                    onPress={() =>
                      setPaymentLines((current) =>
                        current.map((entry) => (entry.id === line.id ? { ...entry, method } : entry)),
                      )
                    }
                  />
                ))}
              </View>

              <Input
                label="Amount"
                accessibilityLabel={`Payment ${index + 1} amount`}
                value={line.amount}
                onChangeText={(value) =>
                  setPaymentLines((current) =>
                    current.map((entry) => (entry.id === line.id ? { ...entry, amount: value } : entry)),
                  )
                }
                keyboardType="numeric"
              />
            </View>
          ))}

          <View style={styles.paymentActions}>
            <Button
              label="Add payment line"
              variant="secondary"
              fullWidth={false}
              accessibilityLabel="Add payment line"
              onPress={() =>
                setPaymentLines((current) => [
                  ...current,
                  { id: generateUUID(), method: 'cash', amount: '0.00' },
                ])
              }
            />
            <Button
              label="Reset total"
              variant="ghost"
              fullWidth={false}
              accessibilityLabel="Reset payment total"
              onPress={() =>
                setPaymentLines([{ id: generateUUID(), method: paymentMethod, amount: total.toFixed(2) }])
              }
            />
          </View>

          <View style={styles.amountSummary}>
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>Received</Text>
              <Text style={styles.changeValue}>{formatCurrency(receivedTotal)}</Text>
            </View>
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>Change Due</Text>
              <Text style={styles.changeValue}>{formatCurrency(changeDue)}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.totalsRow}>
            <Text style={styles.summaryLine}>Subtotal</Text>
            <Text style={styles.summaryLine}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.summaryLine}>Discount</Text>
            <Text style={styles.summaryLine}>{formatCurrency(discountAmount)}</Text>
          </View>
          <View style={styles.totalsRowTotal}>
            <Text style={styles.summaryTotal}>Total</Text>
            <Text style={styles.summaryTotal}>{formatCurrency(total)}</Text>
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>Saving offline. Will sync when connected.</Text>
          <Button
            label={`Complete Sale · ${formatCurrency(total)}`}
            accessibilityLabel="Complete sale"
            onPress={handleCheckout}
            loading={loading}
          />
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: dimensions.lg,
    paddingBottom: dimensions.xl,
  },
  summaryHero: {
    gap: dimensions.xs,
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: dimensions.xl,
  },
  heroKicker: {
    ...typography.bodyMedium,
    color: colors.accentSubtle,
  },
  heroTotal: {
    ...typography.priceHero,
    color: colors.chipActiveText,
    fontVariant: ['tabular-nums'],
  },
  card: {
    gap: dimensions.md,
  },
  paymentCard: {
    gap: dimensions.md,
  },
  paymentLine: {
    gap: dimensions.sm,
    paddingBottom: dimensions.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  paymentLineLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  removePayment: {
    ...typography.caption,
    color: colors.danger,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
  paymentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
  amountSummary: {
    gap: dimensions.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  itemName: {
    color: colors.text,
    fontWeight: '600',
  },
  itemMeta: {
    color: colors.textMuted,
  },
  itemSubtotal: {
    color: colors.text,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: dimensions.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  changeLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  changeValue: {
    ...typography.subtitle,
    color: colors.success,
    backgroundColor: colors.successBg,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.xs,
    borderRadius: dimensions.radiusFull,
    overflow: 'hidden',
  },
  summaryCard: {
    gap: dimensions.sm,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalsRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: dimensions.xs,
  },
  summaryLine: {
    color: colors.textMuted,
  },
  summaryTotal: {
    color: colors.text,
    fontWeight: '700',
  },
  footer: {
    gap: dimensions.sm,
    paddingTop: dimensions.sm,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
