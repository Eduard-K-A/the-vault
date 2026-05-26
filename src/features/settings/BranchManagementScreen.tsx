import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { useBusinessStore } from '@/store/businessStore';

export default function BranchManagementScreen() {
  const navigation = useNavigation();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branches = getLocalDbState().branches.filter((branch) => branch.business_id === businessId);

  return (
    <Screen title="Branches" subtitle="Manage branches and stock locations." onBack={() => navigation.goBack()}>
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
                <Text style={styles.name}>{item.name}</Text>
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
  card: {
    gap: dimensions.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
  },
});
