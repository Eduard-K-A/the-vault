import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, RowGroup, SalesRow, Screen, StatCard } from '@/components/ui';
import { DonutChart, LineChart } from '@/components/charts';
import { EmptyState } from '@/components/EmptyState';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useSales } from '@/hooks/useSales';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import { createSyncTraceId } from '@/utils/syncDebug';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SalesScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Navigation>();
  const { sales } = useSales();
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);
  const branchName = useBusinessStore((state) => state.activeBranch?.name ?? 'All branches');
  const [syncLoading, setSyncLoading] = useState(false);

  const filteredSales = useMemo(() => {
    if (!activeBusiness) {
      return sales;
    }

    return sales.filter((sale) => sale.business_id === activeBusiness.id);
  }, [sales, activeBusiness]);

  const metrics = useMemo(() => {
    const now = new Date();
    const todayTotal = filteredSales
      .filter((sale) => isSameDay(new Date(sale.created_at), now))
      .reduce((sum, sale) => sum + sale.total_amount, 0);
    const weekTotal = filteredSales
      .filter((sale) => isSameWeek(new Date(sale.created_at), now))
      .reduce((sum, sale) => sum + sale.total_amount, 0);
    const monthTotal = filteredSales
      .filter((sale) => isSameMonth(new Date(sale.created_at), now))
      .reduce((sum, sale) => sum + sale.total_amount, 0);

    const paymentBreakdown = filteredSales.reduce<Record<string, number>>((accumulator, sale) => {
      accumulator[sale.payment_method] = (accumulator[sale.payment_method] ?? 0) + sale.total_amount;
      return accumulator;
    }, {});

    return {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      paymentBreakdown,
    };
  }, [filteredSales]);

  const recentSales = useMemo(() => {
    return [...filteredSales].sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
  }, [filteredSales]);

  const trendData = useMemo(
    () =>
      buildTrendData(filteredSales).map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [filteredSales],
  );

  async function handleManualSync() {
    if (syncLoading) {
      return;
    }

    try {
      setSyncLoading(true);
      await syncPowerSyncNow(createSyncTraceId('sales-sync-now'));
    } catch (error) {
      Alert.alert('Manual sync failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <Screen
      title="Sales"
      subtitle={branchName}
      action={
        <View style={styles.headerActions}>
          <SyncStatusBadge />
          <Button
            label="Sync"
            accessibilityLabel="Sync now"
            variant="ghost"
            onPress={handleManualSync}
            loading={syncLoading}
            fullWidth={false}
          />
        </View>
      }
      scrollable
      contentStyle={styles.content}
    >
      <View style={styles.stack}>
        <View style={styles.metricsGrid}>
          <StatCard
            label="Today"
            value={formatCurrency(metrics.today)}
            tone="primary"
            style={styles.metricCard}
            compact
          />
          <StatCard
            label="Week"
            value={formatCurrency(metrics.week)}
            tone="accent"
            style={styles.metricCard}
            compact
          />
          <StatCard
            label="Month"
            value={formatCurrency(metrics.month)}
            tone="success"
            style={styles.metricCard}
            compact
          />
        </View>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Revenue Trend</Text>
              <Text style={styles.chartSubtitle}>Last seven days of completed sales.</Text>
            </View>
          </View>
          <LineChart data={trendData.slice(-7)} />
        </Card>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Payment Mix</Text>
              <Text style={styles.chartSubtitle}>How customers are paying across recent sales.</Text>
            </View>
          </View>
          <DonutChart
            data={Object.entries(metrics.paymentBreakdown).map(([method, value]) => ({
              label: formatPaymentLabel(method),
              value,
            }))}
          />
        </Card>

        <Text style={styles.listLabel}>Recent sales</Text>

        {recentSales.length === 0 ? (
          <EmptyState title="No sales yet" description="Completed sales will appear here." />
        ) : (
          <RowGroup>
            {recentSales.map((item) => (
              <SalesRow
                key={item.id}
                orderId={`#${item.id.slice(0, 8).toUpperCase()}`}
                dateLabel={`${formatDateLabel(item.created_at)} · ${formatPaymentLabel(item.payment_method)}`}
                amount={formatCurrency(item.total_amount)}
                statusLabel={item.status === 'completed' ? 'Paid' : item.status}
                statusTone={item.status === 'completed' ? 'success' : item.status === 'voided' ? 'warning' : 'danger'}
                methodGlyph={paymentGlyph(item.payment_method)}
                onPress={() => navigation.navigate('TransactionDetail', { saleId: item.id })}
              />
            ))}
          </RowGroup>
        )}

        <Button label="View analytics" variant="secondary" onPress={() => navigation.navigate('Analytics')} />
      </View>
    </Screen>
  );
}

function buildTrendData(
  sales: Array<{ created_at: string; total_amount: number }>,
): Array<{ label: string; value: number }> {
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    return {
      key: date.toDateString(),
      label: date.toLocaleDateString([], { weekday: 'short' }),
      value: 0,
    };
  });

  for (const sale of sales) {
    const bucket = buckets.find((entry) => entry.key === new Date(sale.created_at).toDateString());
    if (bucket) {
      bucket.value += sale.total_amount;
    }
  }

  return buckets;
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isSameWeek(left: Date, right: Date): boolean {
  return getWeekKey(left) === getWeekKey(right);
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

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPaymentLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'card':
      return 'Card';
    case 'gcash':
      return 'GCash';
    case 'maya':
      return 'Maya';
    default:
      return 'Cash';
  }
}

function paymentGlyph(method: string): string {
  switch (method) {
    case 'cash':
      return '▭';
    case 'card':
      return '▤';
    case 'gcash':
      return '◫';
    case 'maya':
      return '◪';
    default:
      return '▭';
  }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    paddingBottom: dimensions.xl + 24,
  },
  stack: {
    gap: dimensions.lg,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: dimensions.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: dimensions.sm,
    flexWrap: 'nowrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    flexBasis: 0,
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
  listLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
