import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { signOut } from '@/services/auth.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function BusinessSelectionScreen() {
  const navigation = useNavigation<Navigation>();
  const businesses = useBusinessStore((state) => state.availableBusinesses);
  const selectBusiness = useBusinessStore((state) => state.selectBusiness);
  const role = useAuthStore((state) => state.role);

  function handleSelect(businessId: string) {
    selectBusiness(businessId);
  }

  async function handleBack() {
    await signOut();
  }

  return (
    <Screen
      title="Select business"
      subtitle="Choose a workspace to continue. Owners can also create a new one."
      action={<Badge label={role ?? 'member'} tone="primary" />}
      onBack={handleBack}
    >
      {businesses.length === 0 ? (
        <EmptyState
          title="No businesses linked yet"
          description="Create a business or join with a 6-character code."
          actionLabel={role === 'owner' ? 'Create business' : 'Join business'}
          onAction={() => navigation.navigate(role === 'owner' ? 'CreateBusiness' : 'JoinBusiness')}
        />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.businessId}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <SectionHeader
                title={item.businessName}
                subtitle={item.branchName ?? 'No branch selected'}
                action={<Badge label={item.role} tone={item.role === 'owner' ? 'accent' : 'neutral'} />}
              />
              <Button label="Continue" onPress={() => handleSelect(item.businessId)} />
            </Card>
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <Button label="Join business" variant="secondary" onPress={() => navigation.navigate('JoinBusiness')} />
              {role === 'owner' ? (
                <Button label="Create business" onPress={() => navigation.navigate('CreateBusiness')} />
              ) : null}
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.md,
  },
  footer: {
    gap: dimensions.sm,
    marginTop: dimensions.lg,
  },
});
