import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
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
    <Screen title="Settings" subtitle="Account and workspace controls." action={<Badge label={role ?? 'member'} tone="primary" />}>
      <Card style={styles.card}>
        <SectionHeader title={fullname ?? 'Unknown user'} subtitle={email ?? 'No email'} />
        <Text style={styles.meta}>Business: {business?.name ?? 'None selected'}</Text>
        <Text style={styles.meta}>Branch: {branch?.name ?? 'None selected'}</Text>
        <View style={styles.actions}>
          <Button label="Switch business" variant="secondary" onPress={clearActiveBusiness} />
          <Button label="Branch management" variant="secondary" onPress={() => navigation.navigate('BranchManagement')} />
          <Button label="Reports" variant="secondary" onPress={() => navigation.navigate('Reports')} />
          <Button label="Audit log" variant="secondary" onPress={() => navigation.navigate('AuditLog')} />
          <Button label="Log out" variant="danger" onPress={handleLogout} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.md,
  },
  meta: {
    color: colors.textMuted,
  },
  actions: {
    gap: dimensions.sm,
  },
});
