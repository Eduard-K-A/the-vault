import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Badge, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { useAuthStore } from '@/store/authStore';
import type { RootStackParamList } from '@/types/navigation';

type Route = NativeStackScreenProps<RootStackParamList, 'Receipt'>['route'];
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ReceiptScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const role = useAuthStore((state) => state.role);
  const sale = useMemo(() => getLocalDbState().sales.find((entry) => entry.id === route.params.saleId) ?? null, [route.params.saleId]);
  const items = useMemo(() => getLocalDbState().saleItems.filter((entry) => entry.sale_id === route.params.saleId), [route.params.saleId]);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  if (!sale) {
    return (
      <Screen title="POSly" onBack={handleBack}>
        <View style={styles.stack}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Receipt</Text>
            <Text style={styles.pageSubtitle}>Sale not found.</Text>
          </View>
          <Card>
            <Text style={styles.empty}>The receipt is no longer available.</Text>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <View style={styles.stack}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Receipt</Text>
          <Text style={styles.pageSubtitle}>Local sale record captured for sync.</Text>
        </View>
        <View style={styles.successMark}>
          <Text style={styles.successMarkText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Sale Complete! 🎉</Text>
        <Text style={styles.successSubtitle}>{formatDate(sale.created_at)}</Text>

        <Card style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.storeName}>Acme Retail</Text>
            <Text style={styles.storeMeta}>123 Commerce St, Suite 100</Text>
            <Text style={styles.storeMeta}>Cityville, ST 12345</Text>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.itemList}>
            {items.map((item) => {
              const product = getLocalDbState().products.find((entry) => entry.id === item.product_id);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemName}>{product?.name ?? 'Unknown product'}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.totalsSection}>
            <View style={styles.totalsRow}>
              <Text style={styles.metaLabel}>Subtotal</Text>
              <Text style={styles.metaValue}>{formatCurrency(sale.total_amount + sale.discount_amount)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={[styles.metaLabel, { color: colors.danger }]}>Discount</Text>
              <Text style={[styles.metaValue, { color: colors.danger }]}>-{formatCurrency(sale.discount_amount)}</Text>
            </View>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.totalBand}>
            <Text style={styles.totalBandLabel}>Total</Text>
            <Text style={styles.totalBandValue}>{formatCurrency(sale.total_amount)}</Text>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.metaSection}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Method</Text>
              <Text style={styles.metaValue}>{sale.payment_method}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Sale ID</Text>
              <Text style={styles.metaValue}>Ref: {sale.id.slice(0, 6).toUpperCase()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status</Text>
              <Badge label="Synced ✓" tone="success" />
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button label="Share Receipt" variant="secondary" onPress={() => {}} />
          <Button label="New Sale" onPress={() => navigation.popToTop()} />
        </View>

        {role === 'owner' ? <Button label="Open analytics" variant="ghost" onPress={() => navigation.navigate('Analytics')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
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
  successMark: {
    width: 72,
    height: 72,
    borderRadius: 72,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  successMarkText: {
    color: '#FFFFFF',
    ...typography.title,
  },
  successTitle: {
    ...typography.title,
    textAlign: 'center',
    color: colors.text,
  },
  successSubtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textMuted,
  },
  receiptCard: {
    gap: dimensions.md,
  },
  receiptHeader: {
    alignItems: 'center',
    gap: 2,
  },
  storeName: {
    ...typography.subtitle,
    color: colors.text,
  },
  storeMeta: {
    ...typography.body,
    color: colors.textMuted,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: colors.borderStrong,
    opacity: 0.8,
    marginVertical: dimensions.xs,
  },
  itemList: {
    gap: dimensions.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  totalsSection: {
    gap: dimensions.sm,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
  },
  totalBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.md,
  },
  totalBandLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  totalBandValue: {
    ...typography.title,
    color: colors.text,
  },
  metaSection: {
    gap: dimensions.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
