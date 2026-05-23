import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import type { RootStackParamList } from '@/types/navigation';

type Route = NativeStackScreenProps<RootStackParamList, 'EmployeeDetail'>['route'];

export default function EmployeeDetailScreen() {
  const route = useRoute<Route>();
  const state = getLocalDbState();
  const employee = state.profiles.find((profile) => profile.id === route.params.employeeId) ?? null;
  const sales = state.sales.filter((sale) => sale.employee_id === route.params.employeeId && sale.status === 'completed');

  if (!employee) {
    return (
      <Screen title="Employee detail" subtitle="Employee not found.">
        <EmptyState title="Missing employee" description="The selected employee is unavailable." />
      </Screen>
    );
  }

  const revenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

  return (
    <Screen title={employee.fullname} subtitle={employee.email}>
      <View style={styles.metrics}>
        <StatCard label="Transactions" value={String(sales.length)} tone="primary" />
        <StatCard label="Revenue" value={formatCurrency(revenue)} tone="accent" />
      </View>
      <Card style={styles.card}>
        <Badge label="Recent sales" tone="neutral" />
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.xs }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.label}>{item.created_at}</Text>
              <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
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
  card: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  label: {
    color: colors.textMuted,
    flex: 1,
  },
  amount: {
    color: colors.text,
    fontWeight: '700',
  },
});

