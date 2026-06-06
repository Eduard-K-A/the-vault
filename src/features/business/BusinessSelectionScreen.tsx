import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function BusinessSelectionScreen() {
  const navigation = useNavigation<Navigation>();
  const businesses = useBusinessStore((state) => state.availableBusinesses);
  const selectBusiness = useBusinessStore((state) => state.selectBusiness);
  const role = useAuthStore((state) => state.role);

  async function handleSelect(businessId: string) {
    await selectBusiness(businessId);
  }

  async function handleBack() {
    await signOut();
  }

  return (
    <Screen
      title="Your Businesses"
      action={<Button label="Sign out" variant="ghost" onPress={handleBack} fullWidth={false} />}
    >
      {businesses.length === 0 ? (
        <EmptyState
          title="No businesses linked yet"
          description="Create a business or join with a 6-character code."
          actionLabel={role === 'owner' ? 'Create business' : 'Join business'}
          onAction={() => navigation.navigate(role === 'owner' ? 'CreateBusiness' : 'JoinBusiness')}
        />
      ) : (
        <View style={styles.stack}>
          <Text style={styles.subtitle}>Select a business to continue</Text>
          <Card style={styles.listCard} padded={false}>
            {businesses.map((item, index) => (
              <Pressable key={item.businessId} onPress={() => void handleSelect(item.businessId)} style={[styles.row, index !== businesses.length - 1 && styles.rowDivider]}>
                <View style={[styles.avatar, item.role === 'owner' ? styles.avatarOwner : styles.avatarEmployee]}>
                  <Text style={styles.avatarText}>{item.businessName.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.rowCopy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.businessName}
                    </Text>
                    <Badge label={item.role} tone={item.role === 'owner' ? 'accent' : 'neutral'} />
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.branchName ?? 'No branch selected'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </Card>

          <View style={styles.footer}>
            <Button label="Join a business" variant="secondary" onPress={() => navigation.navigate('JoinBusiness')} />
            {role === 'owner' ? <Button label="Create a business" onPress={() => navigation.navigate('CreateBusiness')} /> : null}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: dimensions.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  listCard: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.md,
    gap: dimensions.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOwner: {
    backgroundColor: colors.accent,
  },
  avatarEmployee: {
    backgroundColor: colors.surfaceAlt,
  },
  avatarText: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '700',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
    minWidth: 0,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
    flexShrink: 1,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chevron: {
    ...typography.subtitle,
    color: colors.textMuted,
    paddingLeft: dimensions.xs,
  },
  footer: {
    gap: dimensions.sm,
  },
});
