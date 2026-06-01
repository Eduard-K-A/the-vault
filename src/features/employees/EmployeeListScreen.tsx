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
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { BusinessMember, Profile } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function EmployeeListScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const business = useBusinessStore((state) => state.activeBusiness);
  const actorId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
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

  return (
    <Screen title="POSly">
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        <Text style={styles.subtitle}>Manage the team and view member performance.</Text>
      </View>
      <Button label="Performance dashboard" onPress={() => navigation.navigate('PerformanceDashboard')} />
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
  header: {
    gap: dimensions.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
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
