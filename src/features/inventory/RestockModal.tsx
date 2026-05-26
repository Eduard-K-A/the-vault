import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { db } from '@/db/powersync';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<RootStackParamList, 'Restock'>['route'];

export default function RestockModal() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const authUserId = useAuthStore((state) => state.userId);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);

  async function handleRestock() {
    if (!authUserId || !branchId) {
      return;
    }

    try {
      setLoading(true);
      await db.writeTransaction(async (tx) => {
        tx.restockInventory({
          productId: route.params.productId,
          branchId,
          quantity: Number(quantity),
          actorId: authUserId,
        });
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Restock failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Restock inventory" subtitle="Inventory logs are recorded for every stock change." onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        <Card style={{ gap: 16 }}>
          <Input label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          <Button label="Apply restock" onPress={handleRestock} loading={loading} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
