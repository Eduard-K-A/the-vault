import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Button, EmployeeRow, RowGroup, Screen, SettingsRow } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { dimensions } from '@/constants/dimensions';
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
    }));
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
    >
      <View style={styles.stack}>
        <RowGroup>
          <SettingsRow
            glyph="▥"
            title="Performance dashboard"
            caption="Leaderboard and sales trends"
            onPress={() => navigation.navigate('PerformanceDashboard')}
          />
        </RowGroup>
        {employees.length === 0 ? (
          <EmptyState
            title="No employees yet"
            description="Share your join code from Settings to invite people."
          />
        ) : (
          <RowGroup>
            {employees.map((item) => (
              <EmployeeRow
                key={item.id}
                name={item.profile?.fullname ?? 'Pending sync'}
                meta={item.profile?.email ?? 'Profile syncing…'}
                roleLabel={item.role}
                roleTone={item.role === 'employee' ? 'neutral' : 'accent'}
                onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.user_id })}
                onLongPress={canRemove ? () => handleRemoveEmployee(item.user_id) : undefined}
              />
            ))}
          </RowGroup>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  stack: {
    gap: dimensions.md,
  },
});
