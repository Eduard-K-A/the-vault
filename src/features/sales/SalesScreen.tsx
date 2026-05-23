import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen, StatCard } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import { useSales } from '@/hooks/useSales';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SalesScreen() {
  const navigation = useNavigation<Navigation>();
  const { sales } = useSales();
  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const todayTotal = sales
      .filter((sale) => new Date(sale.created_at).toDateString() === today)
      .reduce((sum, sale) => sum + sale.total_amount, 0);
    const weekTotal = sales
      .filter((sale) => isSameWeek(new Date(sale.created_at), new Date()))
      .reduce((sum, sale) => sum + sale.total_amount, 0);
    const monthTotal = sales
      .filter((sale) => isSameMonth(new Date(sale.created_at), new Date()))
      .reduce((sum, sale) => sum + sale.total_amount, 0);

    return { today: todayTotal, week: weekTotal, month: monthTotal };
  }, [sales]);

  return (
    <Screen title="Sales" subtitle="Your local transaction history." action={<Badge label="Employee view" tone="primary" />}>
      <View style={styles.metrics}>
        <StatCard label="Today" value={formatCurrency(metrics.today)} tone="primary" />
        <StatCard label="Week" value={formatCurrency(metrics.week)} tone="accent" />
        <StatCard label="Month" value={formatCurrency(metrics.month)} tone="success" />
      </View>
      {sales.length === 0 ? (
        <EmptyState title="No sales yet" description="Checkout completed sales will appear here." />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
          renderItem={({ item }) => (
            <Card style={styles.rowCard}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleId}>{item.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.saleMeta}>{item.created_at}</Text>
                </View>
                <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
              </View>
              <Badge label={item.payment_method} tone="neutral" />
              <Badge
                label={item.status}
                tone={item.status === 'completed' ? 'success' : item.status === 'voided' ? 'warning' : 'danger'}
              />
            </Card>
          )}
        />
      )}
      <Card>
        <Button label="View analytics" onPress={() => navigation.navigate('Analytics')} />
      </Card>
    </Screen>
  );
}

function isSameWeek(left: Date, right: Date): boolean {
  const leftKey = getWeekKey(left);
  const rightKey = getWeekKey(right);
  return leftKey === rightKey;
}

function isSameMonth(left: Date, right: Date): boolean {
  return left.getMonth() === right.getMonth() && left.getFullYear() === right.getFullYear();
}

function getWeekKey(value: Date): string {
  const firstDay = new Date(value.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((value.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + firstDay.getDay() + 1) / 7);
  return `${value.getFullYear()}-${week}`;
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: dimensions.sm,
    flexWrap: 'wrap',
  },
  rowCard: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  saleId: {
    color: colors.text,
    fontWeight: '700',
  },
  saleMeta: {
    color: colors.textMuted,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
});
