import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { db } from '@/db/powersync';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { BusinessMember, Profile } from '@/types/models';
import { createSyncTraceId } from '@/utils/syncDebug';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function EmployeeListScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const business = useBusinessStore((state) => state.activeBusiness);
  const actorId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const [syncLoading, setSyncLoading] = React.useState(false);
  const { data: memberRows } = useQuery<BusinessMember>(
    'SELECT * FROM business_members WHERE business_id = ?',
    [businessId ?? ''],
  );
  const { data: profileRows } = useQuery<Profile>('SELECT * FROM profiles');
  const profilesById = new Map((profileRows as Profile[]).map((profile) => [profile.id, profile]));
  const employees = (memberRows as BusinessMember[])
    .filter((member) => member.business_id === businessId && member.role !== 'owner' && member.is_active !== false)
    .map((member) => ({
      ...member,
      profile: profilesById.get(member.user_id),
    }))
    .filter((entry) => Boolean(entry.profile));
  const canRemove = role === 'owner';

  async function handleRemoveEmployee(employeeId: string) {
    if (!business || !actorId) {
      return;
    }

    Alert.alert('Remove employee?', 'This will revoke access for the employee on reconnect.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await db.writeTransaction(async (tx) =>
            tx.removeBusinessMember({
              businessId: business.id,
              userId: employeeId,
              actorId,
            }),
          );
        },
      },
    ]);
  }

  async function handleManualSync() {
    if (syncLoading) {
      return;
    }

    try {
      setSyncLoading(true);
      await syncPowerSyncNow(createSyncTraceId('employees-sync-now'));
    } catch (error) {
      Alert.alert('Manual sync failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <Screen
      title="Employees"
      subtitle={business?.name}
      action={
        <Button
          label="Sync"
          accessibilityLabel="Sync now"
          variant="secondary"
          onPress={handleManualSync}
          loading={syncLoading}
          fullWidth={false}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('PerformanceDashboard')}
        style={({ pressed }) => [styles.performanceRow, pressed && styles.pressed]}
      >
        <Text style={styles.performanceIcon}>▥</Text>
        <Text style={styles.performanceLabel}>Performance dashboard</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      {employees.length === 0 ? (
        <EmptyState title="No employees found" description="Invite employees with a join code." />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.user_id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.profile?.fullname}</Text>
                    <Text style={styles.meta}>{item.profile?.email}</Text>
                  </View>
                  <Badge label={item.role} tone={item.role === 'employee' ? 'neutral' : 'accent'} />
                </View>
                <Badge label="View details" tone="primary" />
                {canRemove ? (
                  <Button
                    label="Remove"
                    variant="danger"
                    fullWidth={false}
                    onPress={() => handleRemoveEmployee(item.user_id)}
                  />
                ) : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  performanceRow: {
    minHeight: dimensions.rowHeight,
    paddingHorizontal: dimensions.md,
    borderRadius: dimensions.radiusXl,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  performanceIcon: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  performanceLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  chevron: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.9,
  },
  card: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
  },
});
