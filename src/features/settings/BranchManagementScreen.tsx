import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { getLocalDbState } from '@/db/localDb';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function BranchManagementScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branches = getLocalDbState().branches.filter((branch) => branch.business_id === businessId);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>Branches</Text>
        <Text style={styles.subtitle}>Manage branches and stock locations.</Text>
      </View>
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
