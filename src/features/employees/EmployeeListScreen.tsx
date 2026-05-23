import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function EmployeeListScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const employees = getLocalDbState().businessMembers
    .filter((member) => member.business_id === businessId && member.role !== 'owner')
    .map((member) => ({
      ...member,
      profile: getLocalDbState().profiles.find((profile) => profile.id === member.user_id),
    }))
    .filter((entry) => Boolean(entry.profile));

  return (
    <Screen title="Employees" subtitle="Manage the team and view member performance.">
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
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
  },
});
