import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, PlaceholderAction, Screen } from '@/components/ui';
import { ProductPhotoPicker } from '@/components/ProductPhotoPicker';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
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
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Navigation>();
  const authUserId = useAuthStore((state) => state.userId);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sellingPrice, setSellingPrice] = useState('0');
  const [costPrice, setCostPrice] = useState('0');
  const [initialStock, setInitialStock] = useState('0');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; selling?: string; cost?: string }>({});

  async function handleSave() {
    if (!authUserId || !businessId || !branchId) {
      Alert.alert('Save failed', 'Select a branch before creating a product.');
      return;
    }

    const sellingPriceValidation = validatePrice(sellingPrice);
    const costPriceValidation = validatePrice(costPrice);
    const nextErrors: { name?: string; selling?: string; cost?: string } = {};
    if (!name.trim()) {
      nextErrors.name = 'Product name is required.';
    }
    if (!sellingPriceValidation.isValid) {
      nextErrors.selling = sellingPriceValidation.error;
    }
    if (!costPriceValidation.isValid) {
      nextErrors.cost = costPriceValidation.error;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
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
          image_url: imageUrl,
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
        <ProductPhotoPicker value={imageUrl} onChange={setImageUrl} />
        <Card style={styles.card}>
          <Input
            label="Product name"
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder="e.g. Cold Brew 16oz"
          />
          <Text style={styles.helperText}>Category metadata is coming soon. Use description for now.</Text>
          <View style={styles.scanRow}>
            <View style={styles.scanInput}>
              <Input label="Barcode" value={barcode} onChangeText={setBarcode} autoCapitalize="characters" />
            </View>
            <PlaceholderAction label="Scan barcode" message="Scanner is coming soon. Enter SKU manually." />
          </View>
          <Input label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
          <Input label="Initial stock" value={initialStock} onChangeText={setInitialStock} keyboardType="numeric" />
          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <Input label="Selling price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" error={errors.selling} />
            </View>
            <View style={styles.priceField}>
              <Input label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" error={errors.cost} />
            </View>
          </View>
        </Card>
        <Button label="Save Product" onPress={handleSave} loading={loading} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 8,
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
  priceRow: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  priceField: {
    flex: 1,
    minWidth: 0,
  },
});
