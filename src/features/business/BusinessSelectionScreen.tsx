import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { BusinessRow, Button, RowGroup, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function BusinessSelectionScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
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
          <RowGroup>
            {businesses.map((item) => (
              <BusinessRow
                key={item.businessId}
                name={item.businessName}
                meta={item.branchName ?? 'No branch selected'}
                badgeLabel={item.role}
                badgeTone={item.role === 'owner' ? 'accent' : 'neutral'}
                onPress={() => void handleSelect(item.businessId)}
              />
            ))}
          </RowGroup>

          <View style={styles.footer}>
            <Button label="Join a business" variant="secondary" onPress={() => navigation.navigate('JoinBusiness')} />
            {role === 'owner' ? <Button label="Create a business" onPress={() => navigation.navigate('CreateBusiness')} /> : null}
          </View>
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  stack: {
    gap: dimensions.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  footer: {
    gap: dimensions.sm,
  },
});
