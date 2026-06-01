import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { db } from '@/db/powersync';
import { getDeviceIdentity } from '@/services/device.service';
import type { RootStackParamList } from '@/types/navigation';
import type { Product, Sale, SaleItem } from '@/types/models';

type Route = NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>['route'];
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function TransactionDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const { data: saleRows } = useQuery<Sale>('SELECT * FROM sales WHERE id = ?', [route.params.saleId]);
  const { data: itemRows } = useQuery<SaleItem>('SELECT * FROM sale_items WHERE sale_id = ?', [route.params.saleId]);
  const sale = (saleRows as Sale[])[0] ?? null;
  const items = itemRows as SaleItem[];
  const { data: productRows } = useQuery<Product>(
    'SELECT * FROM products WHERE business_id = ?',
    [sale?.business_id ?? ''],
  );
  const productsById = new Map((productRows as Product[]).map((product) => [product.id, product]));
  const canRefund = Boolean(
    sale &&
      sale.status === 'completed' &&
      (role === 'owner' || (role === 'employee' && sale.employee_id === userId)),
  );

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  async function handleRefund() {
    if (!sale || !business || !branch || !userId) {
      return;
    }

    Alert.alert('Refund sale?', 'This will create a refund transaction and restore stock.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Refund',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.writeTransaction(async (tx) =>
              tx.createRefund({
                originalSaleId: sale.id,
                branchId: branch.id,
                businessId: business.id,
                reason: 'Customer return',
                actorId: userId,
                sourceDeviceId: getDeviceIdentity(),
              }),
            );
          } catch (error) {
            Alert.alert('Refund failed', error instanceof Error ? error.message : 'Unknown error');
          }
        },
      },
    ]);
  }

  if (!sale) {
    return (
      <Screen title="POSly" onBack={handleBack}>
        <View style={styles.header}>
          <Text style={styles.title}>Transaction detail</Text>
          <Text style={styles.subtitle}>Transaction not found.</Text>
        </View>
        <Card>
          <Text style={styles.empty}>This sale is unavailable.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction detail</Text>
        <Text style={styles.subtitle}>Review transaction data and sale items.</Text>
      </View>
      <Card style={styles.card}>
        <SectionHeader title={formatCurrency(sale.total_amount)} subtitle={formatDate(sale.created_at)} />
        <View style={styles.metaRow}>
          <Badge label={sale.status} tone={sale.status === 'completed' ? 'success' : 'neutral'} />
          <Text style={styles.meta}>{sale.payment_method}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Reference</Text>
          <Text style={styles.metaValue}>{sale.reference_number ?? sale.id.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>VAT</Text>
          <Text style={styles.metaValue}>{formatCurrency(sale.vat_amount ?? 0)}</Text>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.xs }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.label}>{productsById.get(item.product_id)?.name ?? 'Unknown'}</Text>
              <Text style={styles.amount}>{formatCurrency(item.subtotal)}</Text>
            </View>
          )}
        />
        {canRefund ? <Button label="Refund sale" variant="danger" onPress={handleRefund} /> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: dimensions.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  empty: {
    color: colors.textMuted,
  },
  card: {
    gap: dimensions.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  meta: {
    color: colors.textMuted,
  },
  metaBlock: {
    gap: 2,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  label: {
    color: colors.textMuted,
    flex: 1,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
});
