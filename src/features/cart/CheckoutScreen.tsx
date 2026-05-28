import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '@/hooks/useCart';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { PaymentMethod } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const paymentMethods: PaymentMethod[] = ['cash', 'card', 'gcash', 'others'];

export default function CheckoutScreen() {
  const navigation = useNavigation<Navigation>();
  const role = useAuthStore((state) => state.role);
  const { items, subtotal, discountAmount, total, paymentMethod, setPaymentMethod, checkout } = useCart();
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const [loading, setLoading] = useState(false);
  const [amountReceived, setAmountReceived] = useState('1500');
  const changeDue = Math.max(0, Number(amountReceived || 0) - total);

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

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(role === 'owner' ? 'OwnerApp' : 'EmployeeApp');
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Checkout</Text>
          <Text style={styles.pageSubtitle}>All writes happen locally before sync.</Text>
        </View>
        <Card style={styles.summaryHero}>
          <Text style={styles.heroKicker}>{items.length} items</Text>
          <Text style={styles.heroTotal}>{formatCurrency(total)}</Text>
          <Pressable onPress={() => {}} hitSlop={8}>
            <Text style={styles.heroLink}>View Details ˅</Text>
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <SectionHeader title={business?.name ?? 'No business selected'} subtitle={branch?.name ?? 'No branch selected'} />
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
        <View style={styles.paymentGrid}>
          {paymentMethods.map((method) => (
            <Pressable
              key={method}
              onPress={() => setPaymentMethod(method)}
              style={[styles.paymentTile, paymentMethod === method && styles.paymentTileActive]}
            >
              <Text style={styles.paymentIcon}>{method === 'cash' ? '▭' : method === 'card' ? '▤' : method === 'gcash' ? '◫' : '•••'}</Text>
              <Text style={styles.paymentLabel}>{method === 'gcash' ? 'GCash' : method === 'others' ? 'Others' : method[0].toUpperCase() + method.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Received</Text>
          <View style={styles.amountField}>
            <Text style={styles.peso}>₱</Text>
            <Text style={styles.amountValue}>{amountReceived}</Text>
          </View>
          <View style={styles.changeRow}>
            <Text style={styles.changeLabel}>Change Due</Text>
            <Text style={styles.changeValue}>{formatCurrency(changeDue)}</Text>
          </View>
        </Card>

        <Text style={styles.noteLabel}>Add a note (optional)</Text>
        <Card style={styles.noteCard}>
          <Text style={styles.notePlaceholder}>e.g. VIP Customer</Text>
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
          <Button label="Complete Sale" onPress={handleCheckout} loading={loading} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: dimensions.lg,
    paddingBottom: dimensions.xl,
  },
  pageHeader: {
    gap: dimensions.xs,
  },
  pageTitle: {
    ...typography.title,
    color: colors.text,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  summaryHero: {
    gap: dimensions.xs,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: dimensions.lg,
  },
  heroKicker: {
    ...typography.body,
    color: colors.textMuted,
  },
  heroTotal: {
    ...typography.title,
    color: colors.text,
  },
  heroLink: {
    ...typography.body,
    color: colors.accent,
  },
  card: {
    gap: dimensions.md,
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
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
  paymentTile: {
    width: '48%',
    minHeight: 112,
    borderRadius: dimensions.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: dimensions.sm,
  },
  paymentTileActive: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  paymentIcon: {
    ...typography.title,
    color: colors.accent,
  },
  paymentLabel: {
    ...typography.body,
    color: colors.text,
  },
  amountCard: {
    gap: dimensions.md,
  },
  amountLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: dimensions.radiusMd,
    minHeight: 64,
    paddingHorizontal: dimensions.md,
    gap: dimensions.xs,
  },
  peso: {
    ...typography.title,
    color: colors.text,
  },
  amountValue: {
    ...typography.title,
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
    color: '#065F46',
    backgroundColor: '#A7F3D0',
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.xs,
    borderRadius: dimensions.radiusFull,
    overflow: 'hidden',
  },
  noteLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  noteCard: {
    minHeight: 56,
    justifyContent: 'center',
  },
  notePlaceholder: {
    ...typography.body,
    color: colors.textMuted,
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
