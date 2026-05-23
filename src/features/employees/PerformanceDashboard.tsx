import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { BarChart } from '@/components/charts';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';

export default function PerformanceDashboard() {
  const state = getLocalDbState();
  const business = state.businesses[0];
  const branch = state.branches[0];
  const analytics = business && branch ? getOwnerAnalytics(state, business.id, branch.id) : null;

  if (!analytics) {
    return (
      <Screen title="Performance" subtitle="Employee performance dashboard.">
        <EmptyState title="No data" description="Performance charts appear after sales are recorded." />
      </Screen>
    );
  }

  return (
    <Screen title="Performance" subtitle="Employee leaderboard and category trends.">
      <View style={styles.metrics}>
        <StatCard label="Revenue today" value={formatCurrency(analytics.summary.revenue)} tone="primary" />
        <StatCard label="Top sellers" value={String(analytics.topProducts.length)} tone="accent" />
      </View>
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Top products</Text>
        <BarChart data={analytics.topProducts.slice(0, 5).map((item) => ({ label: item.name, value: item.total_qty }))} />
      </Card>
      <Card style={styles.chartCard}>
        <Badge label="Leaderboard" tone="neutral" />
        <FlatList
          data={analytics.leaderboard}
          keyExtractor={(item) => item.employee_id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.xs }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.label}>{item.fullname}</Text>
              <Text style={styles.amount}>{formatCurrency(item.revenue)}</Text>
            </View>
          )}
        />
      </Card>
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
    gap: dimensions.sm,
  },
  label: {
    color: colors.textMuted,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
});

