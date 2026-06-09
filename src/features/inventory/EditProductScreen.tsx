import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Button, Card, Input, Screen } from '@/components/ui';
import { db } from '@/db/powersync';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import type { RootStackParamList } from '@/types/navigation';
import type { Product } from '@/types/models';
import { validatePrice } from '@/utils/validatePrice';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<RootStackParamList, 'EditProduct'>['route'];

export default function EditProductScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const authUserId = useAuthStore((state) => state.userId);
  const { data: productRows } = useQuery<Product>('SELECT * FROM products WHERE id = ?', [route.params.productId]);
  const product = useMemo(() => (productRows as Product[])[0] ?? null, [productRows]);

  const [name, setName] = useState(product?.name ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [sellingPrice, setSellingPrice] = useState(String(product?.selling_price ?? 0));
  const [costPrice, setCostPrice] = useState(String(product?.cost_price ?? 0));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!product || !authUserId) {
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
      await db.writeTransaction(async (tx) => {
        await tx.upsertProduct(
          {
            ...product,
            name: name.trim(),
            barcode: barcode.trim() || null,
            sku: sku.trim() || null,
            selling_price: Number(sellingPrice),
            cost_price: Number(costPrice),
            updated_at: new Date().toISOString(),
          },
          authUserId,
        );
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

  async function handleArchive() {
    if (!product || !authUserId) {
      return;
    }

    await db.writeTransaction(async (tx) => {
      await tx.archiveProduct(product.id, authUserId);
    });
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.popToTop();
    }
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  if (!product) {
    return (
      <Screen title="Edit product" subtitle="Product not found." onBack={handleBack}>
        <Card>
          <Text style={styles.missing}>The product could not be loaded.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Edit product"
      subtitle="Archived products stay hidden from employees."
      action={<Badge label={product.is_active ? 'Active' : 'Archived'} tone={product.is_active ? 'success' : 'neutral'} />}
      onBack={handleBack}
    >
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        <Card style={{ gap: 16 }}>
          <Input label="Product name" value={name} onChangeText={setName} />
          <Input label="Barcode" value={barcode} onChangeText={setBarcode} autoCapitalize="characters" />
          <Input label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
          <Input label="Selling price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" />
          <Input label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" />
          <Button label="Save changes" onPress={handleSave} loading={loading} />
          <Button label="Archive product" variant="danger" onPress={handleArchive} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: {
    ...typography.body,
    color: colors.textMuted,
  },
});
