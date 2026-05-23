import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { BarChart, LineChart } from '@/components/charts';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { getEmployeeAnalytics, getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';

export default function AnalyticsScreen() {
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.userId);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);

  const analytics =
    role === 'owner' && businessId && branchId
      ? getOwnerAnalytics(getLocalDbState(), businessId, branchId)
      : role === 'employee' && userId
        ? getEmployeeAnalytics(getLocalDbState(), userId)
        : null;

  if (!analytics) {
    return (
      <Screen title="Analytics" subtitle="No active business selected.">
        <EmptyState title="Pick a workspace" description="Analytics are tied to the active business and branch." />
      </Screen>
    );
  }

  const trendData =
    'dailyTotals' in analytics
      ? analytics.dailyTotals.map((item) => ({ label: item.day.slice(5), value: item.total }))
      : analytics.leaderboard.map((item) => ({ label: item.fullname.slice(0, 8), value: item.revenue }));

  return (
    <Screen title="Analytics" subtitle="Local analytics from SQLite-style queries." action={<Badge label={role ?? 'member'} tone="primary" />}>
      <View style={styles.metrics}>
        {'summary' in analytics ? (
          <>
            <StatCard label="Revenue" value={formatCurrency(analytics.summary.revenue)} tone="primary" />
            <StatCard label="Transactions" value={String(analytics.summary.transactions)} tone="accent" />
            <StatCard label="Net" value={formatCurrency(analytics.summary.netRevenue)} tone="success" />
          </>
        ) : (
          <>
            <StatCard label="Today" value={formatCurrency(analytics.todayTotal)} tone="primary" />
            <StatCard label="Week" value={formatCurrency(analytics.weeklyTotal)} tone="accent" />
            <StatCard label="Month" value={formatCurrency(analytics.monthlyTotal)} tone="success" />
          </>
        )}
      </View>

      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Trend</Text>
        <LineChart data={trendData.slice(0, 7)} />
      </Card>

      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Top products</Text>
        <BarChart
          data={('topProducts' in analytics ? analytics.topProducts : []).slice(0, 5).map((item) => ({
            label: item.name,
            value: item.total_qty,
          }))}
        />
      </Card>

      {'paymentBreakdown' in analytics ? (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Payment breakdown</Text>
          <FlatList
            data={analytics.paymentBreakdown}
            keyExtractor={(item) => item.payment_method}
            ItemSeparatorComponent={() => <View style={{ height: dimensions.xs }} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.label}>{item.payment_method}</Text>
                <Text style={styles.amount}>{formatCurrency(item.total_revenue)}</Text>
              </View>
            )}
          />
        </Card>
      ) : null}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textMuted,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
});

