import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { db } from '@/db/powersync';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import { generateUUID } from '@/utils/generateUUID';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AddProductScreen() {
  const navigation = useNavigation<Navigation>();
  const authUserId = useAuthStore((state) => state.userId);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [costPrice, setCostPrice] = useState('0');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!authUserId || !businessId) {
      return;
    }

    try {
      setLoading(true);
      await db.writeTransaction(async (tx) => {
        tx.upsertProduct({
          id: generateUUID(),
          business_id: businessId,
          category_id: null,
          name: name.trim(),
          barcode: barcode.trim() || null,
          sku: sku.trim() || null,
          selling_price: Number(sellingPrice),
          cost_price: Number(costPrice),
          image_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, authUserId);
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Add product" subtitle="Owners can create products for the workspace.">
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        <Card style={{ gap: 16 }}>
          <Input label="Product name" value={name} onChangeText={setName} />
          <Input label="Barcode" value={barcode} onChangeText={setBarcode} autoCapitalize="characters" />
          <Input label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
          <Input label="Selling price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" />
          <Input label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" />
          <Button label="Save" onPress={handleSave} loading={loading} />
          <Button label="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

