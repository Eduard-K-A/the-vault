import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Badge, Button, Card, Input, ModalSheet, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { db } from '@/db/powersync';
import { deleteBusinessRemotely } from '@/services/deleteBusiness.service';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import { canConfirmBusinessDeletion } from './businessDeletionHelpers';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function OwnerSettingsScreen() {
  const navigation = useNavigation<Navigation>();
  const fullname = useAuthStore((state) => state.fullname);
  const email = useAuthStore((state) => state.email);
  const role = useAuthStore((state) => state.role);
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const availableBusinesses = useBusinessStore((state) => state.availableBusinesses);
  const setAvailableBusinesses = useBusinessStore((state) => state.setAvailableBusinesses);
  const clearActiveBusiness = useBusinessStore((state) => state.clearActiveBusiness);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('');
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const canDelete = canConfirmBusinessDeletion(business, deleteConfirmation);

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Logout failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  function openDeleteBusiness() {
    setDeleteConfirmation('');
    setDeleteModalOpen(true);
  }

  function closeDeleteBusiness() {
    if (deleteLoading) {
      return;
    }

    setDeleteConfirmation('');
    setDeleteModalOpen(false);
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
      setDeleteConfirmation('');
      setDeleteModalOpen(false);
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
    <Screen
      scrollable
      contentStyle={styles.content}
    >
      <View style={styles.stack}>
        {role === 'owner' && business?.join_code ? (
          <Card style={styles.joinCodeCard}>
            <View style={styles.joinCodeRow}>
              <View style={styles.joinCodeCopy}>
                <Text style={styles.joinCodeLabel}>Join code</Text>
                <Text style={styles.joinCodeValue}>{business.join_code}</Text>
              </View>
              <Badge label="Share with team" tone="accent" />
            </View>
            <Text style={styles.joinCodeMeta}>
              Employees can use this code when joining your workspace.
            </Text>
          </Card>
        ) : null}
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{(fullname ?? 'U').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{fullname ?? 'Unknown user'}</Text>
              <Text style={styles.profileMeta}>{email ?? 'No email'}</Text>
            </View>
          </View>
          <View style={styles.profileFacts}>
            <Text style={styles.fact}>Business: {business?.name ?? 'None selected'}</Text>
            <Text style={styles.fact}>Branch: {branch?.name ?? 'None selected'}</Text>
          </View>
        </Card>

        <View style={styles.grid}>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('BranchManagement')}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconGlyph}>⌂</Text>
            </View>
            <Text style={styles.gridTitle}>Business Information</Text>
            <Text style={styles.gridBody}>Name, address, contact details</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('BranchManagement')}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconGlyph}>▣</Text>
            </View>
            <Text style={styles.gridTitle}>Branch Management</Text>
            <Text style={styles.gridBody}>Add or configure locations</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('Reports')}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconGlyph}>⌘</Text>
            </View>
            <Text style={styles.gridTitle}>Reports</Text>
            <Text style={styles.gridBody}>Receipts, exports, and summaries</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('AuditLog')}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconGlyph}>⌕</Text>
            </View>
            <Text style={styles.gridTitle}>Audit Logs</Text>
            <Text style={styles.gridBody}>View operator activity history</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={clearActiveBusiness}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconGlyph}>⋯</Text>
            </View>
            <Text style={styles.gridTitle}>Switch Business</Text>
            <Text style={styles.gridBody}>Choose a different workspace</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('PerformanceDashboard')}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconGlyph}>⚑</Text>
            </View>
            <Text style={styles.gridTitle}>Performance</Text>
            <Text style={styles.gridBody}>Leaderboard &amp; sales trends</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('SyncDiagnostics')}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconGlyph}>↻</Text>
            </View>
            <Text style={styles.gridTitle}>Sync Diagnostics</Text>
            <Text style={styles.gridBody}>Pending uploads and retry tools</Text>
          </Pressable>
        </View>

        <Card style={styles.dangerCard}>
          <View style={styles.dangerCopy}>
            <Text style={styles.dangerTitle}>Danger zone</Text>
            <Text style={styles.dangerBody}>
              Permanently delete {business?.name ?? 'the selected business'} and all related products.
            </Text>
          </View>
          <Button
            label="Delete business"
            variant="danger"
            onPress={openDeleteBusiness}
            disabled={!business}
          />
        </Card>

        <Card style={styles.signOutCard}>
          <Button label="Sign out" variant="ghost" onPress={handleLogout} />
        </Card>
      </View>
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
  content: {
    paddingBottom: dimensions.xl + 24,
  },
  stack: {
    gap: dimensions.lg,
  },
  profileCard: {
    gap: dimensions.md,
  },
  joinCodeCard: {
    gap: dimensions.sm,
    backgroundColor: colors.accentSubtle,
  },
  joinCodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  joinCodeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  joinCodeLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  joinCodeValue: {
    ...typography.title,
    color: colors.accent,
    letterSpacing: 4,
  },
  joinCodeMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 56,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    ...typography.subtitle,
    color: colors.text,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    ...typography.subtitle,
    color: colors.text,
  },
  profileMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  profileFacts: {
    gap: dimensions.xs,
  },
  fact: {
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
  },
  gridCard: {
    width: '48%',
    minHeight: 136,
    padding: dimensions.md,
    borderRadius: dimensions.radiusLg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    justifyContent: 'space-between',
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  gridTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  gridBody: {
    ...typography.caption,
    color: colors.textMuted,
  },
  signOutCard: {
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
  dangerBody: {
    ...typography.body,
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
