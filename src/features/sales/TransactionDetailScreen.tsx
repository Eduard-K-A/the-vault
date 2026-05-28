import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Badge, Card, Screen, SectionHeader } from '@/components/ui';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import type { RootStackParamList } from '@/types/navigation';

type Route = NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>['route'];
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function TransactionDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const sale = getLocalDbState().sales.find((entry) => entry.id === route.params.saleId) ?? null;
  const items = getLocalDbState().saleItems.filter((entry) => entry.sale_id === route.params.saleId);

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
