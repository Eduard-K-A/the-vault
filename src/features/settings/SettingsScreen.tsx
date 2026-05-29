import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Navigation>();
  const fullname = useAuthStore((state) => state.fullname);
  const email = useAuthStore((state) => state.email);
  const role = useAuthStore((state) => state.role);
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const clearActiveBusiness = useBusinessStore((state) => state.clearActiveBusiness);

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Logout failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return (
    <Screen title="POSly" action={<Badge label={role ?? 'member'} tone="primary" />} scrollable contentStyle={styles.content}>
      <View style={styles.stack}>
        <View style={styles.header}>
          <Text style={styles.title}>Store Settings</Text>
          <Text style={styles.subtitle}>Manage your business preferences and configurations.</Text>
        </View>
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
            <View style={styles.iconBubble}><Text style={styles.iconGlyph}>⌂</Text></View>
            <Text style={styles.gridTitle}>Business Information</Text>
            <Text style={styles.gridBody}>Name, address, contact details</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('BranchManagement')}>
            <View style={styles.iconBubble}><Text style={styles.iconGlyph}>▣</Text></View>
            <Text style={styles.gridTitle}>Branch Management</Text>
            <Text style={styles.gridBody}>Add or configure locations</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('Reports')}>
            <View style={styles.iconBubble}><Text style={styles.iconGlyph}>⌘</Text></View>
            <Text style={styles.gridTitle}>Reports</Text>
            <Text style={styles.gridBody}>Receipts, exports, and summaries</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('AuditLog')}>
            <View style={styles.iconBubble}><Text style={styles.iconGlyph}>⌕</Text></View>
            <Text style={styles.gridTitle}>Audit Logs</Text>
            <Text style={styles.gridBody}>View operator activity history</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={clearActiveBusiness}>
            <View style={styles.iconBubble}><Text style={styles.iconGlyph}>⋯</Text></View>
            <Text style={styles.gridTitle}>Switch Business</Text>
            <Text style={styles.gridBody}>Choose a different workspace</Text>
          </Pressable>
          <Pressable style={styles.gridCard} onPress={() => navigation.navigate('PerformanceDashboard')}>
            <View style={styles.iconBubble}><Text style={styles.iconGlyph}>⚑</Text></View>
            <Text style={styles.gridTitle}>Performance</Text>
            <Text style={styles.gridBody}>Leaderboard &amp; sales trends</Text>
          </Pressable>
        </View>

        <Card style={styles.signOutCard}>
          <Button label="Sign Out" variant="danger" onPress={handleLogout} />
          <Text style={styles.version}>POSly Terminal v2.4.0</Text>
        </Card>
      </View>
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
  profileCard: {
    gap: dimensions.md,
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
  version: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
