import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
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
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [costPrice, setCostPrice] = useState('0');
  const [initialStock, setInitialStock] = useState('0');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!authUserId || !businessId || !branchId) {
      Alert.alert('Save failed', 'Select a branch before creating a product.');
      return;
    }

    try {
      setLoading(true);
      const productId = generateUUID();
      const stockCount = Math.max(0, Math.trunc(Number(initialStock) || 0));
      await db.writeTransaction(async (tx) => {
        tx.upsertProduct({
          id: productId,
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

        tx.initializeInventory({
          productId,
          branchId,
          quantity: stockCount,
          actorId: authUserId,
        });
      });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.popToTop();
      }
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Add New Product</Text>
          <Text style={styles.subtitle}>Enter product details to add to inventory.</Text>
        </View>
        <Card style={styles.card}>
          <Input label="Product name" value={name} onChangeText={setName} />
          <Input label="Barcode" value={barcode} onChangeText={setBarcode} autoCapitalize="characters" />
          <Input label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
          <Input label="Initial stock" value={initialStock} onChangeText={setInitialStock} keyboardType="numeric" />
          <Input label="Selling price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" />
          <Input label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" />
          <Button label="Save" onPress={handleSave} loading={loading} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 8,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    gap: 16,
  },
});
