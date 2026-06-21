import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, PlaceholderAction, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { db } from '@/db/powersync';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import { generateUUID } from '@/utils/generateUUID';
import { validatePrice } from '@/utils/validatePrice';

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

    // Validate prices
    const sellingPriceValidation = validatePrice(sellingPrice);
    if (!sellingPriceValidation.isValid) {
      Alert.alert('Invalid selling price', sellingPriceValidation.error);
      return;
    }

    const costPriceValidation = validatePrice(costPrice);
    if (!costPriceValidation.isValid) {
      Alert.alert('Invalid cost price', costPriceValidation.error);
      return;
    }

    if (!name.trim()) {
      Alert.alert('Save failed', 'Product name is required.');
      return;
    }

    try {
      setLoading(true);
      const productId = generateUUID();
      const stockCount = Math.max(0, Math.trunc(Number(initialStock) || 0));
      await db.writeTransaction(async (tx) => {
        await tx.upsertProduct({
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

        await tx.initializeInventory({
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
    <Screen title="Add Product" onBack={handleBack} scrollable contentStyle={styles.content}>
        <Card style={styles.photoCard}>
          <Text style={styles.photoIcon}>▧</Text>
          <Text style={styles.photoTitle}>Product photo</Text>
          <View style={styles.photoActions}>
            <PlaceholderAction label="Add photo" message="Photo upload is coming soon. SKU and product info save normally." />
            <PlaceholderAction label="Use camera" message="Photo upload is coming soon. SKU and product info save normally." />
          </View>
        </Card>
        <Card style={styles.card}>
          <Input label="Product name" value={name} onChangeText={setName} />
          <Text style={styles.helperText}>Category metadata is coming soon. Use description for now.</Text>
          <View style={styles.scanRow}>
            <View style={styles.scanInput}>
              <Input label="Barcode" value={barcode} onChangeText={setBarcode} autoCapitalize="characters" />
            </View>
            <PlaceholderAction label="Scan barcode" message="Scanner is coming soon. Enter SKU manually." />
          </View>
          <Input label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
          <Input label="Initial stock" value={initialStock} onChangeText={setInitialStock} keyboardType="numeric" />
          <Input label="Selling price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" />
          <Input label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" />
          <Button label="Save" onPress={handleSave} loading={loading} />
        </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 8,
  },
  photoCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: dimensions.sm,
  },
  photoIcon: {
    ...typography.title,
    color: colors.textSecondary,
    opacity: 0.5,
  },
  photoTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  photoActions: {
    flexDirection: 'row',
    gap: dimensions.sm,
    flexWrap: 'wrap',
  },
  card: {
    gap: 16,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: dimensions.sm,
  },
  scanInput: {
    flex: 1,
    minWidth: 0,
  },
});
