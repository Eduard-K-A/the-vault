import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Badge, Button, Card, Input, ModalSheet, RowGroup, Screen, SettingsRow } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
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
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
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
      title="Settings"
      subtitle={business?.name}
      action={<SyncStatusBadge />}
      scrollable
      contentStyle={styles.content}
    >
      <View style={styles.stack}>
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{(fullname ?? 'U').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{fullname ?? 'Unknown user'}</Text>
              <Text style={styles.profileMeta}>{email ?? 'No email'}</Text>
              <Text style={styles.profileMeta}>
                {business?.name ?? 'No business'}
                {branch?.name ? ` · ${branch.name}` : ''}
              </Text>
            </View>
          </View>
        </Card>

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
              Employees use this code when joining your workspace.
            </Text>
          </Card>
        ) : null}

        <RowGroup label="Business">
          <SettingsRow
            glyph="⌂"
            title="Business information"
            caption="Name, address, contact details"
            onPress={() => navigation.navigate('BranchManagement')}
          />
          <SettingsRow
            glyph="▣"
            title="Branch management"
            caption="Add or configure locations"
            onPress={() => navigation.navigate('BranchManagement')}
          />
          <SettingsRow
            glyph="⋯"
            title="Switch business"
            caption="Choose a different workspace"
            onPress={clearActiveBusiness}
          />
        </RowGroup>

        <RowGroup label="Team">
          <SettingsRow
            glyph="⚑"
            title="Performance dashboard"
            caption="Leaderboard and sales trends"
            onPress={() => navigation.navigate('PerformanceDashboard')}
          />
        </RowGroup>

        <RowGroup label="Data & Reports">
          <SettingsRow
            glyph="⌘"
            title="Reports"
            caption="Receipts, exports, and summaries"
            onPress={() => navigation.navigate('Reports')}
          />
          <SettingsRow
            glyph="⌕"
            title="Audit log"
            caption="Operator activity history"
            onPress={() => navigation.navigate('AuditLog')}
          />
        </RowGroup>

        <RowGroup label="Support">
          <SettingsRow
            glyph="↻"
            title="Sync diagnostics"
            caption="Pending uploads and retry tools"
            onPress={() => navigation.navigate('SyncDiagnostics')}
          />
          <SettingsRow glyph="ⓘ" title="App version" value="0.1.0" />
        </RowGroup>

        <ThemeToggle />

        <Card style={styles.dangerCard}>
          <View style={styles.dangerCopy}>
            <Text style={styles.dangerTitle}>Danger zone</Text>
            <Text style={styles.dangerBody}>
              Permanently delete {business?.name ?? 'the selected business'} and all of its data.
            </Text>
          </View>
          <Button
            label="Delete business"
            variant="danger"
            onPress={openDeleteBusiness}
            disabled={!business}
          />
        </Card>

        <Button label="Sign out" variant="ghost" onPress={handleLogout} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  dangerCard: {
    gap: dimensions.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
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
