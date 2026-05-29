import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { BarChart, DonutChart, LineChart } from '@/components/charts';
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
  const paymentData =
    'paymentBreakdown' in analytics
      ? analytics.paymentBreakdown.map((item) => ({
          label: formatPaymentLabel(item.payment_method),
          value: item.total_revenue,
        }))
      : [];

  return (
    <Screen
      title="Analytics"
      action={<Badge label={role ?? 'member'} tone="primary" />}
      onBack={handleBack}
      scrollable
      contentStyle={styles.content}
    >
      <View style={styles.stack}>
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.selectorActive}>Live analytics</Text>
              <Text style={styles.heroText}>Track revenue, products, team performance, and stock risk in one place.</Text>
            </View>
            <Badge label={paymentData.length > 0 ? 'Fresh data' : 'No data'} tone="accent" />
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
            <View>
              <Text style={styles.chartTitle}>Revenue Trend</Text>
              <Text style={styles.chartSubtitle}>Recent movement by day or top performers.</Text>
            </View>
            <Pressable style={styles.chartChip}>
              <Text style={styles.chartLink}>Daily</Text>
            </Pressable>
          </View>
          <LineChart data={trendData.slice(0, 7)} />
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Top Products</Text>
              <Text style={styles.chartSubtitle}>Which items are driving the most unit movement.</Text>
            </View>
          </View>
          <BarChart
            data={('topProducts' in analytics ? analytics.topProducts : []).slice(0, 5).map((item) => ({
              label: item.name,
              value: item.total_qty,
            }))}
          />
        </Card>

        {'paymentBreakdown' in analytics ? (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Payment Breakdown</Text>
                <Text style={styles.chartSubtitle}>Revenue distribution by payment method.</Text>
              </View>
            </View>
            <DonutChart data={paymentData} />
            <View style={styles.breakdownList}>
              {analytics.paymentBreakdown.map((item) => (
                <View key={item.payment_method} style={styles.row}>
                  <Text style={styles.label}>{formatPaymentLabel(item.payment_method)}</Text>
                  <Text style={styles.amount}>{formatCurrency(item.total_revenue)}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {'lowStockProducts' in analytics ? (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Stock Watchlist</Text>
                <Text style={styles.chartSubtitle}>Products that need restocking soon.</Text>
              </View>
            </View>
            <View style={styles.lowStockList}>
              {analytics.lowStockProducts.slice(0, 5).map((item) => (
                <View key={item.product_id} style={styles.lowStockRow}>
                  <View style={styles.lowStockCopy}>
                    <Text style={styles.label} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.lowStockMeta}>
                      {item.stock_status === 'out_of_stock'
                        ? 'Out of stock'
                        : `Low stock • Threshold ${item.low_stock_threshold}`}
                    </Text>
                  </View>
                  <Badge
                    label={item.stock_status.replace('_', ' ')}
                    tone={item.stock_status === 'out_of_stock' ? 'danger' : 'warning'}
                  />
                </View>
              ))}
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: dimensions.xl + 24,
  },
  stack: {
    gap: dimensions.lg,
  },
  heroCard: {
    padding: dimensions.md,
    backgroundColor: '#F6F5FF',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: dimensions.xs,
  },
  heroText: {
    ...typography.body,
    color: colors.textMuted,
  },
  selectorActive: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: dimensions.radiusFull,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.xs,
    alignSelf: 'flex-start',
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: dimensions.sm,
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
    gap: dimensions.sm,
  },
  chartTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  chartSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  chartChip: {
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.xs,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartLink: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  breakdownList: {
    gap: dimensions.sm,
  },
  lowStockList: {
    gap: dimensions.sm,
  },
  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  lowStockCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  lowStockMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  label: {
    color: colors.textMuted,
    flex: 1,
    minWidth: 0,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
});

function formatPaymentLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'card':
      return 'Card';
    case 'gcash':
      return 'GCash';
    default:
      return 'Other';
  }
}
