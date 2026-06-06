import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Button, Card, Input, ModalSheet, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { db } from '@/db/powersync';
import { deleteBusinessRemotely } from '@/services/deleteBusiness.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { Branch } from '@/types/models';
import { canConfirmBusinessDeletion } from './businessDeletionHelpers';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function BranchManagementScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const business = useBusinessStore((state) => state.activeBusiness);
  const userId = useAuthStore((state) => state.userId);
  const availableBusinesses = useBusinessStore((state) => state.availableBusinesses);
  const setAvailableBusinesses = useBusinessStore((state) => state.setAvailableBusinesses);
  const clearActiveBusiness = useBusinessStore((state) => state.clearActiveBusiness);
  const { data: branchRows } = useQuery<Branch>('SELECT * FROM branches WHERE business_id = ?', [businessId ?? '']);
  const branches = (branchRows as Branch[]).filter((branch) => branch.business_id === businessId);
  const canCreate = Boolean(business && userId);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const canDelete = canConfirmBusinessDeletion(business, deleteConfirmation);

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

  function openDeleteBusiness() {
    setDeleteConfirmation('');
    setDeleteModalOpen(true);
  }

  function closeDeleteBusiness() {
    if (deleteLoading) {
      return;
    }

    setDeleteModalOpen(false);
    setDeleteConfirmation('');
  }

  async function handleDeleteBusiness() {
    if (!business || !canDelete) {
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteBusinessRemotely(business.id);
      await db.writeTransaction(async (tx) => {
        await tx.deleteBusiness({
          businessId: business.id,
        });
      });
      setAvailableBusinesses(availableBusinesses.filter((item) => item.businessId !== business.id));
      clearActiveBusiness();
      setDeleteModalOpen(false);
      setDeleteConfirmation('');
    } catch (error) {
      Alert.alert(
        'Delete business failed',
        error instanceof Error
          ? error.message
          : 'This business could not be deleted. Try again after sync finishes.',
      );
    } finally {
      setDeleteLoading(false);
    }
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
              <View style={styles.actions}>
                <Button label="Edit" variant="secondary" />
              </View>
            </Card>
          )}
        />
      )}
      <Card style={styles.dangerCard}>
        <View style={styles.dangerCopy}>
          <Text style={styles.dangerTitle}>Danger zone</Text>
          <Text style={styles.deleteBody}>
            Permanently delete {business?.name ?? 'the selected business'} and all related products.
          </Text>
        </View>
        <Button label="Delete business" variant="danger" onPress={openDeleteBusiness} disabled={!business} />
      </Card>
      <ModalSheet visible={deleteModalOpen} title="Delete business" onClose={closeDeleteBusiness}>
        <View style={styles.deleteSheet}>
          <Text style={styles.deleteTitle}>This action cannot be undone.</Text>
          <Text style={styles.deleteBody}>
            This will permanently delete the business named{' '}
            <Text style={styles.deleteStrong}>{business?.name ?? ''}</Text>, including its branches, products,
            inventory, sales, employees, and audit records.
          </Text>
          <Text style={styles.deleteBody}>
            Type <Text style={styles.deleteStrong}>{business?.name ?? ''}</Text> to confirm.
          </Text>
          <Input
            label="Confirm business name"
            value={deleteConfirmation}
            onChangeText={setDeleteConfirmation}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.deleteActions}>
            <Button label="Cancel" variant="ghost" onPress={closeDeleteBusiness} fullWidth={false} />
            <Button
              label="Delete business"
              variant="danger"
              onPress={() => void handleDeleteBusiness()}
              loading={deleteLoading}
              disabled={!canDelete}
            />
          </View>
        </View>
      </ModalSheet>
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
  actions: {
    gap: dimensions.sm,
  },
  dangerCard: {
    gap: dimensions.md,
    borderColor: colors.danger,
  },
  dangerCopy: {
    gap: dimensions.xs,
  },
  dangerTitle: {
    ...typography.subtitle,
    color: colors.danger,
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
  deleteSheet: {
    gap: dimensions.md,
  },
  deleteTitle: {
    ...typography.subtitle,
    color: colors.danger,
  },
  deleteBody: {
    ...typography.body,
    color: colors.textMuted,
  },
  deleteStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
});
