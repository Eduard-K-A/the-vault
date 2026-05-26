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
  const sale = useMemo(
    () => getLocalDbState().sales.find((entry) => entry.id === route.params.saleId) ?? null,
    [route.params.saleId],
  );
  const items = useMemo(
    () => getLocalDbState().saleItems.filter((entry) => entry.sale_id === route.params.saleId),
    [route.params.saleId],
  );

  if (!sale) {
    return (
      <Screen title="Receipt" subtitle="Sale not found." onBack={() => navigation.goBack()}>
        <Card>
          <Text style={styles.empty}>The receipt is no longer available.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Receipt" subtitle="Local sale record captured for sync." onBack={() => navigation.goBack()}>
      <Card style={{ gap: dimensions.md }}>
        <SectionHeader title={formatCurrency(sale.total_amount)} subtitle={formatDate(sale.created_at)} />
        <Badge label={sale.status} tone={sale.status === 'completed' ? 'success' : 'neutral'} />
        <Text style={styles.meta}>Payment method: {sale.payment_method}</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.xs }} />}
          renderItem={({ item }) => {
            const product = getLocalDbState().products.find((entry) => entry.id === item.product_id);
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{product?.name ?? 'Unknown product'}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
              </View>
            );
          }}
        />
        <Button label="Done" onPress={() => navigation.navigate(role === 'owner' ? 'OwnerApp' : 'EmployeeApp')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
  meta: {
    color: colors.textMuted,
  },
  row: {
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
});
