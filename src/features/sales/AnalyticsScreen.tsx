import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { BarChart, LineChart } from '@/components/charts';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { getEmployeeAnalytics, getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AnalyticsScreen() {
  const navigation = useNavigation<Navigation>();
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

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  if (!analytics) {
    return (
      <Screen title="Analytics" subtitle="No active business selected." onBack={handleBack}>
        <EmptyState title="Pick a workspace" description="Analytics are tied to the active business and branch." />
      </Screen>
    );
  }

  const trendData =
    'dailyTotals' in analytics
      ? analytics.dailyTotals.map((item) => ({ label: item.day.slice(5), value: item.total }))
      : analytics.leaderboard.map((item) => ({ label: item.fullname.slice(0, 8), value: item.revenue }));

  return (
    <Screen title="Analytics" action={<Badge label={role ?? 'member'} tone="primary" />} onBack={handleBack}>
      <View style={styles.stack}>
        <Card style={styles.selectorCard}>
          <View style={styles.selectorRow}>
            <Text style={styles.selectorActive}>Daily</Text>
            <Text style={styles.selectorItem}>Weekly</Text>
            <Text style={styles.selectorItem}>Monthly</Text>
            <Text style={styles.selectorItem}>☷</Text>
          </View>
        </Card>

        <View style={styles.revenueHeader}>
          <View>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>{'summary' in analytics ? formatCurrency(analytics.summary.revenue) : formatCurrency(analytics.todayTotal)}</Text>
          </View>
          <Badge label="+12.5%" tone="success" />
        </View>

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
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Top 5 Products</Text>
            <Text style={styles.chartLink}>View All</Text>
          </View>
          <LineChart data={trendData.slice(0, 7)} />
        </Card>

        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Top Performers</Text>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: dimensions.lg,
  },
  selectorCard: {
    padding: dimensions.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.md,
  },
  selectorActive: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: dimensions.radiusMd,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.xs,
  },
  selectorItem: {
    ...typography.body,
    color: colors.textMuted,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  revenueLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  revenueValue: {
    ...typography.title,
    color: colors.text,
    marginTop: 2,
  },
  metrics: {
    flexDirection: 'row',
    gap: dimensions.sm,
    flexWrap: 'wrap',
  },
  chartCard: {
    gap: dimensions.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  chartLink: {
    ...typography.body,
    color: colors.accent,
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
