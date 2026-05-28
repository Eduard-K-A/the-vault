import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import CartSheet from '@/features/cart/CartSheet';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
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
  const fullname = useAuthStore((state) => state.fullname);
  const role = useAuthStore((state) => state.role);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const businessName = useBusinessStore((state) => state.activeBusiness?.name ?? 'Inventory');
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
  }, [branchId]);

  const summary = useMemo(() => {
    const lowStock = Array.from(inventoryByProductId.values()).filter((value) => value > 0 && value <= 5).length;
    const outOfStock = Array.from(inventoryByProductId.values()).filter((value) => value <= 0).length;
    return { lowStock, outOfStock, total: products.length };
  }, [inventoryByProductId, products.length]);

  function handleAdd(product: Product) {
    addItem(product, 1);
  }

  const header = (
    <View style={styles.headerStack}>
      <View style={styles.topBar}>
        <View style={styles.topBarRow}>
          <View>
            <Text style={styles.greeting}>Hi, {fullname?.split(' ')[0] ?? 'there'} 👋</Text>
          </View>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>POSly</Text>
            <View style={styles.brandDot} />
          </View>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.businessName}>{businessName}</Text>
          <SyncStatusBadge />
        </View>
      </View>

      <View style={styles.summaryStrip}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Products</Text>
          <Text style={styles.metricValue}>{summary.total}</Text>
        </Card>
        <Card style={[styles.metricCard, styles.warningCard]}>
          <Text style={styles.metricLabelWarning}>Low Stock</Text>
          <Text style={styles.metricValueWarning}>{summary.lowStock}</Text>
        </Card>
        <Card style={[styles.metricCard, styles.dangerCard]}>
          <Text style={styles.metricLabelDanger}>Out of Stock</Text>
          <Text style={styles.metricValueDanger}>{summary.outOfStock}</Text>
        </Card>
      </View>

      <Card style={styles.searchCard}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
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
      </Card>
    </View>
  );

  return (
    <Screen>
      {products.length === 0 ? (
        <View style={styles.stack}>
          {header}
          <EmptyState
            title="No matching products"
            description="Try a different search term or barcode."
            actionLabel={role === 'owner' ? 'Add product' : undefined}
            onAction={role === 'owner' ? () => navigation.navigate('AddProduct') : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              stockQuantity={inventoryByProductId.get(item.id)}
              onPress={
                role === 'employee'
                  ? handleAdd
                  : () => navigation.navigate('EditProduct', { productId: item.id })
              }
            />
          )}
        />
      )}

      <CartSheet visible={cartVisible} onClose={() => setCartVisible(false)} />
      <Pressable
        onPress={() => (role === 'owner' ? navigation.navigate('AddProduct') : setCartVisible(true))}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: dimensions.lg,
  },
  headerStack: {
    gap: dimensions.md,
  },
  topBar: {
    gap: dimensions.md,
    backgroundColor: colors.accent,
    borderRadius: dimensions.radiusXl,
    paddingHorizontal: dimensions.lg,
    paddingVertical: dimensions.lg,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  greeting: {
    ...typography.subtitle,
    color: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  brandText: {
    ...typography.subtitle,
    color: '#FFFFFF',
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6FFBBE',
  },
  businessName: {
    ...typography.body,
    color: '#DAD8FF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: dimensions.sm,
    overflow: 'hidden',
    marginTop: dimensions.xs,
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    minHeight: 92,
    justifyContent: 'space-between',
    gap: dimensions.sm,
    borderRadius: dimensions.radiusMd,
  },
  metricLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  metricValue: {
    ...typography.title,
    color: colors.text,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: '#FCD34D',
  },
  dangerCard: {
    backgroundColor: '#FDE8E8',
    borderColor: '#FCA5A5',
  },
  metricLabelWarning: {
    ...typography.body,
    color: '#9A3412',
  },
  metricValueWarning: {
    ...typography.title,
    color: '#B45309',
  },
  metricLabelDanger: {
    ...typography.body,
    color: '#991B1B',
  },
  metricValueDanger: {
    ...typography.title,
    color: '#B91C1C',
  },
  searchCard: {
    padding: dimensions.md,
    marginTop: dimensions.xs,
  },
  listContent: {
    gap: dimensions.md,
    paddingBottom: dimensions.xl,
  },
  fab: {
    position: 'absolute',
    right: dimensions.screenPaddingH,
    bottom: dimensions.screenPaddingV + 56,
    width: 56,
    height: 56,
    borderRadius: dimensions.radiusXl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  fabLabel: {
    color: '#FFFFFF',
    ...typography.title,
    lineHeight: 28,
  },
});
