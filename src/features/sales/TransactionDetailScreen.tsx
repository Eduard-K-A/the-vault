import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';

import { Badge, Card, Screen, SectionHeader } from '@/components/ui';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import type { RootStackParamList } from '@/types/navigation';

type Route = NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>['route'];

export default function TransactionDetailScreen() {
  const route = useRoute<Route>();
  const sale = getLocalDbState().sales.find((entry) => entry.id === route.params.saleId) ?? null;
  const items = getLocalDbState().saleItems.filter((entry) => entry.sale_id === route.params.saleId);

  if (!sale) {
    return (
      <Screen title="Transaction detail" subtitle="Transaction not found.">
        <Card>
          <Text style={styles.empty}>This sale is unavailable.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Transaction detail" subtitle="Review transaction data and sale items.">
      <Card style={{ gap: dimensions.md }}>
        <SectionHeader title={formatCurrency(sale.total_amount)} subtitle={formatDate(sale.created_at)} />
        <Badge label={sale.status} tone={sale.status === 'completed' ? 'success' : 'neutral'} />
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.xs }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.label}>{getLocalDbState().products.find((entry) => entry.id === item.product_id)?.name ?? 'Unknown'}</Text>
              <Text style={styles.amount}>{formatCurrency(item.subtotal)}</Text>
            </View>
          )}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.textMuted,
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

