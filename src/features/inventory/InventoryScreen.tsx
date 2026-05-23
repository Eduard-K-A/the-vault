import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Screen, SectionHeader } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import CartSheet from '@/features/cart/CartSheet';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { Product } from '@/types/models';
import { getLocalDbState } from '@/db/localDb';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function InventoryScreen() {
  const navigation = useNavigation<Navigation>();
  const role = useAuthStore((state) => state.role);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const [cartVisible, setCartVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { products, findByBarcode } = useProducts(search);
  const { addItem } = useCart();

  const inventoryByProductId = useMemo(() => {
    if (!branchId) {
      return new Map<string, number>();
    }

    return new Map(
      getLocalDbState()
        .inventory.filter((item) => item.branch_id === branchId)
        .map((item) => [item.product_id, item.stock_quantity]),
    );
  }, [branchId, products]);

  function handleAdd(product: Product) {
    addItem(product, 1);
  }

  return (
    <Screen
      title="Inventory"
      subtitle="Search products, scan barcodes, or manage stock."
      action={<SyncStatusBadge />}
    >
      <View style={styles.topBar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onScanPress={() => {
            const firstBarcode = products[0]?.barcode;
            if (firstBarcode) {
              const product = findByBarcode(firstBarcode);
              if (product) {
                handleAdd(product);
              }
            }
          }}
        />
        {role === 'owner' ? (
          <Button label="Add product" onPress={() => navigation.navigate('AddProduct')} />
        ) : (
          <Button label="Open cart" onPress={() => setCartVisible(true)} />
        )}
      </View>

      {products.length === 0 ? (
        <EmptyState
          title="No matching products"
          description="Try a different search term or barcode."
          actionLabel={role === 'owner' ? 'Add product' : undefined}
          onAction={role === 'owner' ? () => navigation.navigate('AddProduct') : undefined}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              stockQuantity={inventoryByProductId.get(item.id)}
              onAdd={role === 'employee' ? handleAdd : undefined}
              onEdit={role === 'owner' ? () => navigation.navigate('EditProduct', { productId: item.id }) : undefined}
            />
          )}
        />
      )}

      {role === 'employee' ? (
        <View style={styles.bottomAction}>
          <Button label="Open cart" onPress={() => setCartVisible(true)} />
        </View>
      ) : null}
      <CartSheet visible={cartVisible} onClose={() => setCartVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    gap: dimensions.sm,
  },
  bottomAction: {
    marginTop: dimensions.sm,
  },
});
