import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { BarChart, DonutChart } from '@/components/charts';
import { getLocalDbState } from '@/db/localDb';
import { getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SalesOverviewScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const analytics = businessId && branchId ? getOwnerAnalytics(getLocalDbState(), businessId, branchId) : null;

  if (!analytics) {
    return (
      <Screen title="Sales overview" subtitle="Business-wide sales and analytics.">
        <EmptyState title="Select a business" description="Owners need an active business to view sales data." />
      </Screen>
    );
  }

  return (
    <Screen title="Sales overview" subtitle="Business-wide performance and transaction access.">
      <View style={styles.metrics}>
        <StatCard label="Revenue today" value={formatCurrency(analytics.summary.revenue)} tone="primary" />
        <StatCard label="Transactions" value={String(analytics.summary.transactions)} tone="accent" />
        <StatCard label="Net revenue" value={formatCurrency(analytics.summary.netRevenue)} tone="success" />
      </View>

      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Payment methods</Text>
        <DonutChart
          data={analytics.paymentBreakdown.map((item) => ({
            label: item.payment_method,
            value: item.total_revenue,
          }))}
        />
      </Card>

      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Best sellers</Text>
        <BarChart
          data={analytics.topProducts.slice(0, 5).map((item) => ({
            label: item.name,
            value: item.total_qty,
          }))}
        />
      </Card>

      {analytics.leaderboard.length === 0 ? (
        <EmptyState title="No employees yet" description="Employee performance will appear after more sales are recorded." />
      ) : (
        <FlatList
          data={analytics.leaderboard}
          keyExtractor={(item) => item.employee_id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.employee_id })}>
              <Card style={styles.rowCard}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.fullname}</Text>
                    <Text style={styles.meta}>{item.transactions} transactions</Text>
                  </View>
                  <Text style={styles.amount}>{formatCurrency(item.revenue)}</Text>
                </View>
                <Badge label="Open detail" tone="neutral" />
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: dimensions.sm,
    flexWrap: 'wrap',
  },
  chartCard: {
    gap: dimensions.md,
  },
  chartTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  rowCard: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
});
