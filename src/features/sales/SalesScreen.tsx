import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen, StatCard } from '@/components/ui';
import { BarChart, DonutChart } from '@/components/charts';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useSales } from '@/hooks/useSales';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import { useQuery } from '@powersync/react';
import type { Business } from '@/types/models';
import { createSyncTraceId } from '@/utils/syncDebug';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SalesScreen() {
  const navigation = useNavigation<Navigation>();
  const { sales } = useSales();
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);
  const availableBusinesses = useBusinessStore((state) => state.availableBusinesses);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [syncLoading, setSyncLoading] = useState(false);
  const { data: businessRows } = useQuery<Business>('SELECT * FROM businesses');

  useEffect(() => {
    setSelectedBusinessId(activeBusiness?.id ?? 'all');
  }, [activeBusiness?.id]);

  const businessOptions = useMemo(() => {
    const summaries = availableBusinesses
      .map((item) => {
        const business = (businessRows as Business[]).find((entry) => entry.id === item.businessId);
        return business
          ? {
              businessId: business.id,
              businessName: business.name,
            }
          : null;
      })
      .filter((item): item is { businessId: string; businessName: string } => item !== null);

    return [{ businessId: 'all', businessName: 'All businesses' }, ...summaries];
  }, [availableBusinesses, businessRows]);

  const filteredSales = useMemo(() => {
    if (selectedBusinessId === 'all') {
      return sales;
    }

    return sales.filter((sale) => sale.business_id === selectedBusinessId);
  }, [sales, selectedBusinessId]);

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
      title="My Sales"
      action={
        <View style={styles.headerActions}>
          <Badge label="Employee view" tone="primary" />
          <Button
            label="Sync"
            accessibilityLabel="Sync now"
            variant="secondary"
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
          <BarChart data={trendData.slice(-7)} />
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
          <EmptyState title="No sales yet" description="Checkout completed sales will appear here." />
        ) : (
          <View style={styles.salesList}>
            {recentSales.map((item) => (
              <Card key={item.id} style={styles.rowCard}>
                <View style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.saleId}>{item.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.saleMeta}>{formatDateLabel(item.created_at)}</Text>
                    {getBusinessName(item.business_id, businessOptions) ? (
                      <Text style={styles.saleBusiness}>
                        {getBusinessName(item.business_id, businessOptions)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
                </View>
                <View style={styles.badges}>
                  <Badge label={formatPaymentLabel(item.payment_method)} tone="neutral" />
                  <Badge
                    label={item.status}
                    tone={item.status === 'completed' ? 'success' : item.status === 'voided' ? 'warning' : 'danger'}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        <Button label="View analytics" onPress={() => navigation.navigate('Analytics')} />
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

function getBusinessName(
  businessId: string,
  businesses: Array<{ businessId: string; businessName: string }>,
): string {
  return businesses.find((item) => item.businessId === businessId)?.businessName ?? '';
}

const styles = StyleSheet.create({
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
  salesList: {
    gap: dimensions.sm,
  },
  rowCard: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  saleId: {
    color: colors.text,
    fontWeight: '700',
  },
  saleMeta: {
    color: colors.textMuted,
    marginTop: 2,
  },
  saleBusiness: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 2,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    gap: dimensions.xs,
    flexWrap: 'wrap',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
