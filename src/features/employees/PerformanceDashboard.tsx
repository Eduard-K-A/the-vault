import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { EmployeeRow, RowGroup, Screen, StatCard } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { dimensions } from '@/constants/dimensions';
import { formatCurrency } from '@/utils/formatCurrency';
import { useBusinessStore } from '@/store/businessStore';
import type { BusinessMember, Profile, Sale } from '@/types/models';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function PerformanceDashboard() {
  const navigation = useNavigation<Navigation>();
  const business = useBusinessStore((store) => store.activeBusiness);
  const businessId = business?.id ?? null;
  const { data: profileRows } = useQuery<Profile>('SELECT * FROM profiles');
  const { data: memberRows } = useQuery<BusinessMember>(
    'SELECT * FROM business_members WHERE business_id = ?',
    [businessId ?? ''],
  );
  const { data: saleRows } = useQuery<Sale>('SELECT * FROM sales WHERE business_id = ?', [businessId ?? '']);

  const performers = useMemo(() => {
    const profilesById = new Map((profileRows as Profile[]).map((profile) => [profile.id, profile]));
    const completedSales = (saleRows as Sale[]).filter(
      (sale) => sale.business_id === businessId && sale.status === 'completed',
    );

    return (memberRows as BusinessMember[])
      .filter((member) => member.business_id === businessId && member.role !== 'owner' && member.is_active !== false)
      .map((member) => {
        const profile = profilesById.get(member.user_id);
        const memberSales = completedSales.filter((sale) => sale.employee_id === member.user_id);
        const revenue = memberSales.reduce((sum, sale) => sum + sale.total_amount, 0);
        return {
          id: member.id,
          userId: member.user_id,
          name: profile?.fullname ?? 'Pending sync',
          email: profile?.email ?? 'Profile syncing…',
          revenue,
          transactions: memberSales.length,
        };
      })
      .sort((left, right) => right.revenue - left.revenue);
  }, [businessId, memberRows, profileRows, saleRows]);

  const totalRevenue = performers.reduce((sum, item) => sum + item.revenue, 0);
  const activeSellers = performers.filter((item) => item.transactions > 0).length;

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  return (
    <Screen title="Performance" subtitle={business?.name} onBack={handleBack} scrollable contentStyle={styles.content}>
      <View style={styles.stack}>
        <View style={styles.statsRow}>
          <StatCard label="Employees" value={String(performers.length)} tone="primary" compact style={styles.statCard} />
          <StatCard label="Active sellers" value={String(activeSellers)} tone="success" compact style={styles.statCard} />
          <StatCard label="Revenue" value={formatCurrency(totalRevenue)} tone="accent" compact style={styles.statCard} />
        </View>

        {performers.length === 0 ? (
          <EmptyState
            title="No employees yet"
            description="Share your join code from Settings to invite people."
          />
        ) : (
          <RowGroup label="Sales performance">
            {performers.map((item) => (
              <EmployeeRow
                key={item.id}
                name={item.name}
                meta={`${formatCurrency(item.revenue)} · ${item.transactions} order${item.transactions === 1 ? '' : 's'}`}
                roleLabel={item.transactions > 0 ? `${item.transactions}` : 'No sales'}
                roleTone={item.transactions > 0 ? 'success' : 'neutral'}
                onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.userId })}
              />
            ))}
          </RowGroup>
        )}
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
  statsRow: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    flexBasis: 0,
  },
});
