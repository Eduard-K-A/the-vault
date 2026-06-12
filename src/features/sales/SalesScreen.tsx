import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { buildSalesForBusinessQuery } from '@/db/queries/salesQueries';
import { refreshBusinessDataFromDatabase } from '@/services/businessDataRefresh.service';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { powersync } from '@/db/powersync';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { createSyncTraceId, logSyncDebug } from '@/utils/syncDebug';
import type { RootStackParamList } from '@/types/navigation';
import { useQuery } from '@powersync/react';
import type { Business } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface EmployeeSalesSnapshot {
  completedSaleCount: number;
  latestSaleAt: string | null;
}

async function loadEmployeeSalesSnapshot(
  businessId: string,
  employeeId: string,
): Promise<EmployeeSalesSnapshot> {
  const salesQuery = buildSalesForBusinessQuery(businessId);
  const row = await powersync.getOptional<{
    count: number | string | null;
    latest_sale_at: string | null;
  }>(
    `SELECT COUNT(*) AS count, MAX(created_at) AS latest_sale_at FROM (${salesQuery.sql}) AS employee_sales WHERE employee_id = ? AND status = 'completed'`,
    [...salesQuery.parameters, employeeId],
  );

  return {
    completedSaleCount: Number(row?.count ?? 0),
    latestSaleAt: row?.latest_sale_at ?? null,
  };
}

export default function SalesScreen() {
  const navigation = useNavigation<Navigation>();
  const { sales } = useSales();
  const userId = useAuthStore((state) => state.userId);
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);
  const activeBranch = useBusinessStore((state) => state.activeBranch);
  const availableBusinesses = useBusinessStore((state) => state.availableBusinesses);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [syncLoading, setSyncLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { data: businessRows } = useQuery<Business>('SELECT * FROM businesses');

  useEffect(() => {
    setSelectedBusinessId(activeBusiness?.id ?? 'all');
  }, [activeBusiness?.id]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

  async function handleManualSync() {
    if (!activeBusiness?.id) {
      Alert.alert('Sync failed', 'Select a business before syncing sales.');
      return;
    }
    if (!userId) {
      Alert.alert('Sync failed', 'Sign in before syncing sales.');
      return;
    }

    const traceId = createSyncTraceId('sync-now');
    logSyncDebug(traceId, 'sales screen sync button pressed', {
      businessId: activeBusiness.id,
      branchId: activeBranch?.id ?? null,
      employeeId: userId,
      selectedBusinessId,
      visibleSaleCount: filteredSales.length,
      totalSaleCount: sales.length,
      syncLoading,
    });

    try {
      setSyncLoading(true);
      const beforeSnapshot = await loadEmployeeSalesSnapshot(activeBusiness.id, userId);
      logSyncDebug(traceId, 'sales screen employee sales before sync', {
        businessId: activeBusiness.id,
        employeeId: userId,
        ...beforeSnapshot,
      });
      logSyncDebug(traceId, 'sales screen PowerSync manual sync requested');
      await syncPowerSyncNow(traceId);
      logSyncDebug(traceId, 'sales screen business refresh requested', {
        businessId: activeBusiness.id,
        employeeId: userId,
      });
      const refreshResult = await refreshBusinessDataFromDatabase(activeBusiness.id, {}, traceId);
      logSyncDebug(traceId, 'sales screen business refresh returned', { ...refreshResult });
      const afterSnapshot = await loadEmployeeSalesSnapshot(activeBusiness.id, userId);
      logSyncDebug(traceId, 'sales screen employee sales after refresh', {
        businessId: activeBusiness.id,
        employeeId: userId,
        beforeCompletedSaleCount: beforeSnapshot.completedSaleCount,
        ...afterSnapshot,
      });
      setToastMessage(`${afterSnapshot.completedSaleCount} sales synced`);
    } catch (error) {
      logSyncDebug(traceId, 'sales screen sync failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncLoading(false);
      logSyncDebug(traceId, 'sales screen sync finished');
    }
  }

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

  const selectedBusinessName = businessOptions.find((item) => item.businessId === selectedBusinessId)?.businessName ?? 'All businesses';
  const selectedBusinessLabel =
    selectedBusinessId !== 'all' && activeBusiness?.id === selectedBusinessId && activeBranch
      ? `${selectedBusinessName} · ${activeBranch.name}`
      : selectedBusinessName;

  return (
    <Screen
      title="My Sales"
      action={<Badge label="Employee view" tone="primary" />}
      scrollable
      contentStyle={styles.content}
    >
      <View style={styles.stack}>
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>Sales overview</Text>
              <Text style={styles.heroTitle}>A quick read on today, week, and month performance.</Text>
              <Text style={styles.heroBody}>
                Filter by business to separate sales from different workspaces.
              </Text>
            </View>
            <View style={styles.heroActions}>
              <Badge label={`${recentSales.length} records`} tone="accent" />
              <Button
                label="Sync now"
                variant="secondary"
                onPress={() => void handleManualSync()}
                loading={syncLoading}
                fullWidth={false}
              />
            </View>
          </View>
        </Card>

        <View style={styles.filterWrap}>
          <Text style={styles.filterLabel}>Business filter</Text>
          <View style={styles.filterRow}>
            {businessOptions.map((item) => {
              const active = item.businessId === selectedBusinessId;
              return (
                <Pressable
                  key={item.businessId}
                  accessibilityRole="button"
                  onPress={() => setSelectedBusinessId(item.businessId)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    active && styles.filterChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>
                    {item.businessName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.filterMeta}>Showing sales for {selectedBusinessLabel}.</Text>
        </View>

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

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Daily sales pulse</Text>
          <Text style={styles.summaryBody}>Completed sales are listed below with payment method and status chips for quick scanning.</Text>
        </Card>

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
                    <Text style={styles.saleBusiness}>
                      {getBusinessName(item.business_id, businessOptions)}
                    </Text>
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
      {toastMessage ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastLabel}>{toastMessage}</Text>
        </View>
      ) : null}
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
  return businesses.find((item) => item.businessId === businessId)?.businessName ?? 'Unknown business';
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: dimensions.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: dimensions.xs,
  },
  heroActions: {
    alignItems: 'flex-end',
    gap: dimensions.sm,
  },
  heroKicker: {
    ...typography.label,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  heroBody: {
    ...typography.body,
    color: colors.textMuted,
  },
  filterWrap: {
    gap: dimensions.xs,
  },
  filterLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
  filterChip: {
    minHeight: 38,
    paddingHorizontal: dimensions.md,
    borderRadius: dimensions.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  filterChipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterMeta: {
    ...typography.caption,
    color: colors.textMuted,
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
  summaryCard: {
    gap: dimensions.xs,
  },
  summaryTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  summaryBody: {
    ...typography.body,
    color: colors.textMuted,
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
  toast: {
    position: 'absolute',
    left: dimensions.screenPaddingH,
    right: dimensions.screenPaddingH,
    top: dimensions.screenPaddingV + 12,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.sm,
    borderRadius: dimensions.radiusFull,
    backgroundColor: 'rgba(25, 28, 30, 0.92)',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastLabel: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
});
