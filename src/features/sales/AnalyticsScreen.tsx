import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { BarChart, DonutChart, LineChart } from '@/components/charts';
import { EmptyState } from '@/components/EmptyState';
import { getEmployeeAnalytics, getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import {
  buildPaymentsForBusinessQuery,
  buildSaleItemsForBusinessQuery,
  buildSalesForBusinessQuery,
} from '@/db/queries/salesQueries';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { AuditLog, Branch, Business, BusinessMember, Category, InventoryRecord, Payment, Profile, Product, Refund, RefundItem, Sale, SaleItem } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AnalyticsScreen() {
  const navigation = useNavigation<Navigation>();
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.userId);
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);
  const businessId = activeBusiness?.id ?? null;
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const activeBranch = useBusinessStore((state) => state.activeBranch);
  const availableBusinesses = useBusinessStore((state) => state.availableBusinesses);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const { data: profileRows } = useQuery<Profile>('SELECT * FROM profiles');
  const { data: businessRows } = useQuery<Business>('SELECT * FROM businesses');
  const { data: memberRows } = useQuery<BusinessMember>('SELECT * FROM business_members');
  const { data: branchRows } = useQuery<Branch>('SELECT * FROM branches');
  const { data: categoryRows } = useQuery<Category>('SELECT * FROM categories');
  const { data: productRows } = useQuery<Product>('SELECT * FROM products');
  const { data: inventoryRows } = useQuery<InventoryRecord>('SELECT * FROM inventory_items');
  const salesQuery = buildSalesForBusinessQuery(businessId);
  const saleItemsQuery = buildSaleItemsForBusinessQuery(businessId);
  const paymentsQuery = buildPaymentsForBusinessQuery(businessId);
  const { data: saleRows } = useQuery<Sale>(salesQuery.sql, salesQuery.parameters);
  const { data: itemRows } = useQuery<SaleItem>(saleItemsQuery.sql, saleItemsQuery.parameters);
  const { data: paymentRows } = useQuery<Payment>(paymentsQuery.sql, paymentsQuery.parameters);
  const { data: refundRows } = useQuery<Refund>('SELECT * FROM refunds');
  const { data: refundItemRows } = useQuery<RefundItem>('SELECT * FROM refund_items');
  const { data: auditLogRows } = useQuery<AuditLog>('SELECT * FROM audit_logs');

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

  const filteredState = useMemo(() => {
    const state = {
      profiles: profileRows as Profile[],
      businesses: businessRows as Business[],
      businessMembers: memberRows as BusinessMember[],
      branches: branchRows as Branch[],
      categories: categoryRows as Category[],
      products: productRows as Product[],
      inventory: inventoryRows as InventoryRecord[],
      sales: saleRows as Sale[],
      saleItems: itemRows as SaleItem[],
      payments: paymentRows as Payment[],
      refunds: refundRows as Refund[],
      refundItems: refundItemRows as RefundItem[],
      inventoryLogs: [],
      auditLogs: auditLogRows as AuditLog[],
    };
    if (selectedBusinessId === 'all') {
      return state;
    }

    const saleIds = new Set(state.sales.filter((sale) => sale.business_id === selectedBusinessId).map((sale) => sale.id));
    return {
      ...state,
      sales: state.sales.filter((sale) => sale.business_id === selectedBusinessId),
      saleItems: state.saleItems.filter((item) => saleIds.has(item.sale_id)),
    };
  }, [
    auditLogRows,
    branchRows,
    businessRows,
    categoryRows,
    inventoryRows,
    itemRows,
    memberRows,
    paymentRows,
    profileRows,
    productRows,
    refundItemRows,
    refundRows,
    saleRows,
    selectedBusinessId,
  ]);
  const selectedBusinessLabel =
    selectedBusinessId !== 'all' && activeBusiness?.id === selectedBusinessId && activeBranch
      ? `${businessOptions.find((item) => item.businessId === selectedBusinessId)?.businessName ?? 'Selected business'} · ${activeBranch.name}`
      : businessOptions.find((item) => item.businessId === selectedBusinessId)?.businessName ?? 'Selected business';

  const analytics =
    role === 'owner' && businessId && branchId
      ? getOwnerAnalytics(filteredState, businessId, branchId)
      : role === 'employee' && userId
        ? getEmployeeAnalytics(filteredState, userId)
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
                  style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>{item.businessName}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.filterMeta}>
            {selectedBusinessId === 'all'
              ? 'Showing combined analytics across all linked businesses.'
              : `Showing analytics for ${selectedBusinessLabel}.`}
          </Text>
        </View>

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
              <StatCard
                label="Revenue"
                value={formatCurrency(analytics.summary.revenue)}
                tone="primary"
                style={styles.metricCard}
                compact
              />
              <StatCard
                label="Transactions"
                value={String(analytics.summary.transactions)}
                tone="accent"
                style={styles.metricCard}
                compact
              />
              <StatCard
                label="Net"
                value={formatCurrency(analytics.summary.netRevenue)}
                tone="success"
                style={styles.metricCard}
                compact
              />
            </>
          ) : (
            <>
              <StatCard label="Today" value={formatCurrency(analytics.todayTotal)} tone="primary" style={styles.metricCard} compact />
              <StatCard label="Week" value={formatCurrency(analytics.weeklyTotal)} tone="accent" style={styles.metricCard} compact />
              <StatCard label="Month" value={formatCurrency(analytics.monthlyTotal)} tone="success" style={styles.metricCard} compact />
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
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
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
