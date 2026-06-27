import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Button, Card, Input, Screen } from '@/components/ui';
import { ProductPhotoPicker } from '@/components/ProductPhotoPicker';
import { db } from '@/db/powersync';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import type { RootStackParamList } from '@/types/navigation';
import type { Product } from '@/types/models';
import { buildProductByIdQuery } from '@/db/queries/productQueries';
import { validatePrice } from '@/utils/validatePrice';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<RootStackParamList, 'EditProduct'>['route'];

export default function EditProductScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const authUserId = useAuthStore((state) => state.userId);
  const productByIdQuery = useMemo(() => buildProductByIdQuery(route.params.productId), [route.params.productId]);
  const { data: productRows } = useQuery<Product>(productByIdQuery.sql, productByIdQuery.parameters);
  const product = useMemo(() => (productRows as Product[])[0] ?? null, [productRows]);

  const [name, setName] = useState(product?.name ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);
  const [sellingPrice, setSellingPrice] = useState(String(product?.selling_price ?? 0));
  const [costPrice, setCostPrice] = useState(String(product?.cost_price ?? 0));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; selling?: string; cost?: string }>({});

  async function handleSave() {
    if (!product || !authUserId) {
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
      await db.writeTransaction(async (tx) => {
        await tx.upsertProduct(
          {
            ...product,
            name: name.trim(),
            barcode: barcode.trim() || null,
            sku: sku.trim() || null,
            image_url: imageUrl,
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
      scrollable
      contentStyle={styles.content}
    >
      <ProductPhotoPicker value={imageUrl} onChange={setImageUrl} />
      <Card style={styles.card}>
        <Input label="Product name" value={name} onChangeText={setName} error={errors.name} />
        <Input label="Barcode" value={barcode} onChangeText={setBarcode} autoCapitalize="characters" />
        <Input label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
        <View style={styles.priceRow}>
          <View style={styles.priceField}>
            <Input label="Selling price" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" error={errors.selling} />
          </View>
          <View style={styles.priceField}>
            <Input label="Cost price" value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" error={errors.cost} />
          </View>
        </View>
        <Button label="Save changes" onPress={handleSave} loading={loading} />
      </Card>
      <Button label="Archive product" variant="danger" onPress={handleArchive} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  card: {
    gap: 16,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceField: {
    flex: 1,
    minWidth: 0,
  },
  missing: {
    ...typography.body,
    color: colors.textMuted,
  },
});
