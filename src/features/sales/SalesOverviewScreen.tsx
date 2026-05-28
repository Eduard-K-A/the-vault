import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type PeriodKey = 'Today' | '7 Days' | '30 Days' | 'Custom';

const PERIODS: PeriodKey[] = ['Today', '7 Days', '30 Days', 'Custom'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SalesOverviewScreen() {
  const navigation = useNavigation<Navigation>();
  const [period, setPeriod] = useState<PeriodKey>('Today');
  const state = getLocalDbState();
  const businessId = useBusinessStore((store) => store.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((store) => store.activeBranch?.id ?? null);
  const analytics = businessId && branchId ? getOwnerAnalytics(state, businessId, branchId) : null;

  const filteredSales = useMemo(() => {
    if (!businessId || !branchId) {
      return [];
    }

    const now = new Date();
    return state.sales
      .filter((sale) => sale.business_id === businessId && sale.branch_id === branchId)
      .filter((sale) => isWithinPeriod(new Date(sale.created_at), now, period))
      .sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at));
  }, [branchId, businessId, period, state.sales]);

  const dayTotals = useMemo(() => {
    const today = new Date();
    return DAY_LABELS.map((label, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (DAY_LABELS.length - 1 - index));
      const total = filteredSales
        .filter((sale) => isSameDay(new Date(sale.created_at), date))
        .reduce((sum, sale) => sum + sale.total_amount, 0);

      return {
        label,
        value: total,
      };
    });
  }, [filteredSales]);

  const metrics = useMemo(() => {
    const transactions = filteredSales.length;
    const revenue = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const netRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_amount - sale.discount_amount, 0);
    const averageValue = revenue / Math.max(transactions, 1);
    const topMethod = getTopPaymentMethod(filteredSales);

    return {
      transactions,
      revenue,
      netRevenue,
      averageValue,
      topMethod,
    };
  }, [filteredSales]);

  if (!analytics) {
    return (
      <Screen title="Sales overview" subtitle="Business-wide sales and analytics.">
        <EmptyState title="Select a business" description="Owners need an active business to view sales data." />
      </Screen>
    );
  }

  return (
      <Screen title="Store POS">
      <View style={styles.stack}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Sales Overview</Text>
        </View>
        <View style={styles.periodRow}>
          {PERIODS.map((item) => {
            const active = item === period;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => setPeriod(item)}
                style={({ pressed }) => [styles.periodChip, active && styles.periodChipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.periodLabel, active && styles.periodLabelActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.hero}>
          <Text style={styles.kicker}>Total revenue</Text>
          <Text style={styles.revenue}>{formatCurrency(metrics.revenue)}</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeArrow}>↗</Text>
            <Text style={styles.heroBadgeText}>+12.4% vs last period</Text>
          </View>
        </Card>

        <View style={styles.metricsGrid}>
          <MetricCard icon="▦" label="Transactions" value={String(metrics.transactions)} delta="+4.2%" tone="success" />
          <MetricCard icon="◔" label="Average Value" value={formatCurrency(metrics.averageValue)} delta="−0.0%" tone="neutral" />
          <MetricCard icon="◫" label="Net Revenue" value={formatCurrency(metrics.netRevenue)} delta="+11.5%" tone="success" />
          <MetricCard icon="▤" label="Top Method" value={metrics.topMethod.name} delta={metrics.topMethod.share} tone="neutral" />
        </View>

        <Card style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.chartTitle}>Revenue by Day</Text>
            <Text style={styles.chartMenu}>⋯</Text>
          </View>
          <View style={styles.chartGrid}>
            {dayTotals.map((item) => {
              const max = Math.max(...dayTotals.map((entry) => entry.value), 1);
              const active = item.label === 'Thu';
              const height = Math.max(12, (item.value / max) * 100);

              return (
                <View key={item.label} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${height}%`,
                          backgroundColor: active ? colors.accent : '#C7C4F5',
                        },
                        active && styles.barFillActive,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, active && styles.barLabelActive]}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <Pressable style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
            <Text style={styles.linkLabel}>View All</Text>
          </Pressable>
        </View>

        {filteredSales.length === 0 ? (
          <EmptyState title="No sales yet" description="Completed sales will appear here when transactions are recorded." />
        ) : (
          <Card padded={false} style={styles.listCard}>
            {filteredSales.slice(0, 3).map((sale, index) => (
              <View key={sale.id} style={[styles.saleRow, index < 2 && styles.saleDivider]}>
                <View style={styles.saleIdentity}>
                  <View style={styles.saleIcon}>
                    <Text style={styles.saleIconText}>{getSaleSymbol(sale.payment_method)}</Text>
                  </View>
                  <View style={styles.saleCopy}>
                    <Text style={styles.saleTitle}>Order #{sale.id.slice(-4).toUpperCase()}</Text>
                    <Text style={styles.saleMeta}>
                      {formatTime(sale.created_at)} • {formatPaymentLabel(sale.payment_method)}
                    </Text>
                  </View>
                </View>
                <View style={styles.saleAmountWrap}>
                  <Text style={styles.saleAmount}>{formatCurrency(sale.total_amount)}</Text>
                  <Badge label="Paid" tone="success" />
                </View>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.cardsGrid}>
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Top 5 Products</Text>
            <View style={styles.rankList}>
              {analytics.topProducts.slice(0, 5).map((item, index) => {
                const max = Math.max(...analytics.topProducts.slice(0, 5).map((entry) => entry.total_qty), 1);
                const width = Math.max(24, (item.total_qty / max) * 100);

                return (
                  <View key={item.product_id} style={styles.rankRow}>
                    <Text style={styles.rankName} numberOfLines={1}>
                      {truncate(item.name, 14)}
                    </Text>
                    <View style={styles.rankTrack}>
                      <View
                        style={[
                          styles.rankFill,
                          {
                            width: `${width}%`,
                            backgroundColor: index === 0 ? colors.accent : index === 1 ? '#6D67EA' : index === 2 ? '#8E89EA' : '#B5B1F2',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.rankValue}>{item.total_qty}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Top Performers</Text>
            <View style={styles.performerList}>
              {analytics.leaderboard.slice(0, 3).map((item, index) => (
                <View key={item.employee_id} style={styles.performerRow}>
                  <View style={[styles.performerAvatar, performerAvatarStyles[index % performerAvatarStyles.length]]}>
                    <Text style={styles.performerInitials}>{getInitials(item.fullname)}</Text>
                    <View style={styles.performerRankBadge}>
                      <Text style={styles.performerRankText}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.performerCopy}>
                    <Text style={styles.performerName}>{item.fullname}</Text>
                    <Text style={styles.performerMeta}>{item.transactions} orders</Text>
                  </View>
                  <Text style={styles.performerAmount}>{formatCurrency(item.revenue)}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Payment Methods</Text>
            <View style={styles.paymentBody}>
              <View style={styles.paymentRing}>
                <Text style={styles.paymentRingLabel}>Total</Text>
                <Text style={styles.paymentRingValue}>{metrics.transactions}</Text>
              </View>
              <View style={styles.legend}>
                {analytics.paymentBreakdown.slice(0, 4).map((item, index) => (
                  <View key={item.payment_method} style={styles.legendRow}>
                    <View style={[styles.legendSwatch, { backgroundColor: paymentColors[index % paymentColors.length] }]} />
                    <Text style={styles.legendLabel}>{formatPaymentLabel(item.payment_method)}</Text>
                    <Text style={styles.legendValue}>{Math.round((item.total_revenue / Math.max(metrics.revenue, 1)) * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  delta: string;
  tone: 'success' | 'neutral';
}

function MetricCard({ icon, label, value, delta, tone }: MetricCardProps) {
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[styles.metricDelta, tone === 'success' ? styles.metricDeltaSuccess : styles.metricDeltaNeutral]}>{delta}</Text>
    </Card>
  );
}

function isWithinPeriod(value: Date, now: Date, period: PeriodKey): boolean {
  if (period === 'Custom') {
    return true;
  }

  if (period === 'Today') {
    return isSameDay(value, now);
  }

  const diffDays = Math.floor((now.getTime() - value.getTime()) / 86400000);
  if (period === '7 Days') {
    return diffDays >= 0 && diffDays < 7;
  }

  return diffDays >= 0 && diffDays < 30;
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function getTopPaymentMethod(sales: Array<{ payment_method: string; total_amount: number }>): { name: string; share: string } {
  if (sales.length === 0) {
    return { name: 'None', share: '0% of volume' };
  }

  const breakdown = sales.reduce<Record<string, number>>((accumulator, sale) => {
    accumulator[sale.payment_method] = (accumulator[sale.payment_method] ?? 0) + sale.total_amount;
    return accumulator;
  }, {});

  const [method, total] = Object.entries(breakdown).sort((left, right) => right[1] - left[1])[0];
  const share = Math.round((total / sales.reduce((sum, sale) => sum + sale.total_amount, 0)) * 100);

  return {
    name: formatPaymentLabel(method),
    share: `${share}% of volume`,
  };
}

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

function getSaleSymbol(method: string): string {
  switch (method) {
    case 'cash':
      return '₱';
    case 'card':
      return '⌁';
    case 'gcash':
      return '◉';
    default:
      return '⋯';
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const paymentColors = ['#4B41E1', '#6D67EA', '#00A36C', '#C8C7D1'];
const performerAvatarStyles = [
  { backgroundColor: '#D9D6FF' },
  { backgroundColor: '#E0F7EF' },
  { backgroundColor: '#F0E0FF' },
];

const styles = StyleSheet.create({
  stack: {
    gap: dimensions.lg,
  },
  pageHeader: {
    gap: dimensions.xs,
  },
  pageTitle: {
    ...typography.title,
    color: colors.text,
  },
  periodRow: {
    flexDirection: 'row',
    gap: dimensions.sm,
    flexWrap: 'wrap',
  },
  periodChip: {
    minHeight: 42,
    paddingHorizontal: dimensions.md,
    borderRadius: dimensions.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  periodLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  periodLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hero: {
    gap: dimensions.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    minHeight: 150,
  },
  kicker: {
    ...typography.label,
    color: '#C6C4DF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  revenue: {
    ...typography.title,
    color: '#FFFFFF',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.xs,
    borderRadius: dimensions.radiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  heroBadgeArrow: {
    color: '#6FFBBE',
    fontWeight: '700',
  },
  heroBadgeText: {
    ...typography.label,
    color: '#6FFBBE',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
  metricCard: {
    width: '48%',
    gap: dimensions.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  metricIcon: {
    color: colors.textMuted,
    fontSize: 15,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  metricValue: {
    ...typography.subtitle,
    color: colors.text,
  },
  metricDelta: {
    ...typography.label,
  },
  metricDeltaSuccess: {
    color: colors.success,
  },
  metricDeltaNeutral: {
    color: colors.textMuted,
  },
  chartCard: {
    gap: dimensions.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  chartMenu: {
    color: colors.textMuted,
    fontSize: 24,
    lineHeight: 24,
    marginTop: -4,
  },
  chartGrid: {
    height: 180,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: dimensions.sm,
    paddingBottom: dimensions.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: dimensions.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    gap: dimensions.xs,
  },
  barTrack: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: dimensions.radiusSm,
    borderTopRightRadius: dimensions.radiusSm,
  },
  barFillActive: {
    shadowColor: colors.accent,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  barLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  barLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: dimensions.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  linkButton: {
    minHeight: 28,
    justifyContent: 'center',
  },
  linkLabel: {
    ...typography.caption,
    color: colors.accent,
  },
  listCard: {
    overflow: 'hidden',
  },
  saleRow: {
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  saleDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  saleIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
    flex: 1,
    minWidth: 0,
  },
  saleIcon: {
    width: 40,
    height: 40,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleIconText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  saleCopy: {
    flex: 1,
    minWidth: 0,
  },
  saleTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  saleMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: dimensions.xs,
  },
  saleAmountWrap: {
    alignItems: 'flex-end',
    gap: dimensions.xs,
  },
  saleAmount: {
    color: colors.text,
    fontWeight: '700',
  },
  cardsGrid: {
    gap: dimensions.lg,
  },
  rankList: {
    gap: dimensions.md,
  },
  rankRow: {
    gap: dimensions.xs,
  },
  rankName: {
    color: colors.text,
    fontWeight: '600',
  },
  rankTrack: {
    height: 14,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  rankFill: {
    height: '100%',
    borderRadius: dimensions.radiusFull,
  },
  rankValue: {
    alignSelf: 'flex-end',
    color: colors.textMuted,
    ...typography.caption,
  },
  performerList: {
    gap: dimensions.md,
  },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  performerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performerInitials: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  performerRankBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6FFBBE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  performerRankText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  performerCopy: {
    flex: 1,
    minWidth: 0,
  },
  performerName: {
    color: colors.text,
    fontWeight: '700',
  },
  performerMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: dimensions.xs,
  },
  performerAmount: {
    color: colors.text,
    fontWeight: '700',
  },
  paymentBody: {
    gap: dimensions.md,
    alignItems: 'center',
  },
  paymentRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: '#5B53E8',
    borderTopColor: '#A9A7F4',
    borderRightColor: '#6E68EA',
    borderBottomColor: '#5B53E8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  paymentRingLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  paymentRingValue: {
    ...typography.title,
    color: colors.text,
    marginTop: dimensions.xs,
  },
  legend: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
  legendRow: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    color: colors.textMuted,
    ...typography.caption,
  },
  legendValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
