import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
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
import type { Branch } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function BranchManagementScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const business = useBusinessStore((state) => state.activeBusiness);
  const userId = useAuthStore((state) => state.userId);
  const { data: branchRows } = useQuery<Branch>('SELECT * FROM branches WHERE business_id = ?', [businessId ?? '']);
  const branches = (branchRows as Branch[]).filter((branch) => branch.business_id === businessId);
  const canCreate = Boolean(business && userId);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  async function handleCreateBranch() {
    if (!business || !userId) {
      return;
    }

    await db.writeTransaction(async (tx) =>
      tx.createBranch({
        businessId: business.id,
        name: `Branch ${branches.length + 1}`,
        actorId: userId,
      }),
    );
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>Branches</Text>
        <Text style={styles.subtitle}>Manage branches and stock locations.</Text>
      </View>
      {canCreate ? <Button label="Add branch" onPress={handleCreateBranch} /> : null}
      {branches.length === 0 ? (
        <EmptyState title="No branches" description="Create a branch when the business is set up." />
      ) : (
        <FlatList
          data={branches}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>Branch location and inventory pool</Text>
                </View>
                <Badge label={item.is_active ? 'Active' : 'Inactive'} tone={item.is_active ? 'success' : 'neutral'} />
              </View>
              <Button label="Edit" variant="secondary" />
            </Card>
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
    justifyContent: 'space-between',
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
