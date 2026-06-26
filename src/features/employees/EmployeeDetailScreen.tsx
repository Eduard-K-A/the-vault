import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Card, Screen, StatCard } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import type { RootStackParamList } from '@/types/navigation';
import type { Profile, Sale } from '@/types/models';

type Route = NativeStackScreenProps<RootStackParamList, 'EmployeeDetail'>['route'];
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function EmployeeDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { data: profileRows } = useQuery<Profile>('SELECT * FROM profiles WHERE id = ?', [route.params.employeeId]);
  const { data: saleRows } = useQuery<Sale>(
    "SELECT * FROM sales WHERE employee_id = ? AND status = 'completed'",
    [route.params.employeeId],
  );
  const employee = (profileRows as Profile[])[0] ?? null;
  const sales = saleRows as Sale[];

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  if (!employee) {
    return (
    <Screen title="Employee" subtitle="Employee not found." onBack={handleBack}>
        <EmptyState title="Missing employee" description="The selected employee is unavailable." />
      </Screen>
    );
  }

  const revenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

  return (
    <Screen title={employee.fullname} subtitle={employee.email} onBack={handleBack}>
      <View style={styles.stack}>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: dimensions.lg,
  },
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
