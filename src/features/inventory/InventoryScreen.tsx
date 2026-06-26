import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Button, ComingSoonSheet, Input, ModalSheet, Screen, Toast } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import CartSheet from '@/features/cart/CartSheet';
import { colors } from '@/constants/colors';
import { dimensions, elevation } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { db } from '@/db/powersync';
import { buildInventoryForBranchQuery } from '@/db/queries/inventoryQueries';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { InventoryRecord, Product } from '@/types/models';
import { createSyncTraceId } from '@/utils/syncDebug';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function InventoryScreen() {
  const navigation = useNavigation<Navigation>();
  const role = useAuthStore((state) => state.role);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const branchName = useBusinessStore((state) => state.activeBranch?.name ?? 'Main branch');
  const businessName = useBusinessStore((state) => state.activeBusiness?.name ?? 'Inventory');
  const [cartVisible, setCartVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('1');
  const [restockLoading, setRestockLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [scanSoonVisible, setScanSoonVisible] = useState(false);
  const lastInventoryViewSnapshot = useRef<{
    businessId: string | null;
    branchId: string | null;
    productCount: number;
    inventoryCount: number;
  } | null>(null);
  const { products } = useProducts(search);
  const { addItem, items, total } = useCart();
  const inventoryQuery = useMemo(() => buildInventoryForBranchQuery(branchId), [branchId]);
  const { data: inventoryItems } = useQuery<InventoryRecord>(
    inventoryQuery.sql,
    inventoryQuery.parameters,
  );

  const inventoryByProductId = useMemo(() => {
    if (!branchId) {
      return new Map<string, number>();
    }

    return new Map(
      (inventoryItems as InventoryRecord[]).map((item) => [item.product_id, item.stock_quantity]),
    );
  }, [branchId, inventoryItems]);

  const summary = useMemo(() => {
    const lowStock = Array.from(inventoryByProductId.values()).filter((value) => value > 0 && value <= 5).length;
    const outOfStock = Array.from(inventoryByProductId.values()).filter((value) => value <= 0).length;
    return { lowStock, outOfStock, total: products.length };
  }, [inventoryByProductId, products.length]);

  function handleAdd(product: Product) {
    addItem(product, 1);
    setToastMessage(`${product.name} added to cart`);
  }

  function openRestock(product: Product) {
    setRestockProduct(product);
    setRestockQuantity('1');
  }

  function closeRestock() {
    if (restockLoading) {
      return;
    }
    setRestockProduct(null);
    setRestockQuantity('1');
  }

  async function handleRestock() {
    if (!restockProduct || !branchId || !useAuthStore.getState().userId) {
      return;
    }

    const quantity = Math.max(1, Math.trunc(Number(restockQuantity) || 0));

    try {
      setRestockLoading(true);
      await db.writeTransaction(async (tx) => {
        await tx.restockInventory({
          productId: restockProduct.id,
          branchId,
          quantity,
          actorId: useAuthStore.getState().userId as string,
        });
      });
      setToastMessage(`${quantity} added to ${restockProduct.name}`);
      setRestockProduct(null);
      setRestockQuantity('1');
    } catch (error) {
      Alert.alert('Restock failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setRestockLoading(false);
    }
  }

  async function handleManualSync() {
    if (syncLoading) {
      return;
    }

    try {
      setSyncLoading(true);
      await syncPowerSyncNow(createSyncTraceId('inventory-sync-now'));
      setToastMessage('Inventory synced');
    } catch (error) {
      Alert.alert('Manual sync failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncLoading(false);
    }
  }

  useEffect(() => {
    const nextSnapshot = {
      businessId: useBusinessStore.getState().activeBusiness?.id ?? null,
      branchId,
      productCount: products.length,
      inventoryCount: (inventoryItems as InventoryRecord[]).length,
    };
    const previous = lastInventoryViewSnapshot.current;
    if (
      !previous ||
      previous.businessId !== nextSnapshot.businessId ||
      previous.branchId !== nextSnapshot.branchId ||
      previous.productCount !== nextSnapshot.productCount ||
      previous.inventoryCount !== nextSnapshot.inventoryCount
    ) {
      console.debug('[inventory-view] visible data changed', {
        previous,
        next: nextSnapshot,
      });
    }
    lastInventoryViewSnapshot.current = nextSnapshot;
  }, [branchId, inventoryItems, products.length]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const headerActions = (
    <View style={styles.headerActions}>
      <SyncStatusBadge />
      <Button
        label="Sync"
        accessibilityLabel="Sync now"
        variant="ghost"
        onPress={handleManualSync}
        loading={syncLoading}
        fullWidth={false}
      />
    </View>
  );

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.summaryLine}>
        <Text style={styles.summaryStrong}>{summary.total}</Text>
        {' products  ·  '}
        <Text style={styles.summaryWarn}>{summary.lowStock}</Text>
        {' low  ·  '}
        <Text style={styles.summaryDanger}>{summary.outOfStock}</Text>
        {' out of stock'}
      </Text>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search products..."
        onScanUnavailable={() => setScanSoonVisible(true)}
      />
    </View>
  );

  const showCartFab = role === 'employee' && items.length > 0;

  return (
    <Screen
      title={businessName}
      subtitle={`${branchName} · ${role ?? 'employee'}`}
      action={headerActions}
      contentStyle={styles.screenContent}
    >
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            title="No products yet"
            description="Add your first product to start selling."
            actionLabel={role === 'owner' ? 'Add product' : undefined}
            onAction={role === 'owner' ? () => navigation.navigate('AddProduct') : undefined}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.gridCell}>
            <ProductCard
              product={item}
              stockQuantity={inventoryByProductId.get(item.id)}
              onPress={
                role === 'employee'
                  ? handleAdd
                  : () => navigation.navigate('EditProduct', { productId: item.id })
              }
              onAdd={role === 'owner' ? openRestock : undefined}
              onEdit={
                role === 'owner'
                  ? () => navigation.navigate('EditProduct', { productId: item.id })
                  : undefined
              }
            />
          </View>
        )}
      />

      <CartSheet visible={cartVisible} onClose={() => setCartVisible(false)} />
      <ModalSheet
        visible={restockProduct !== null}
        title="Restock product"
        onClose={closeRestock}
      >
        <View style={styles.restockSheet}>
          <View style={styles.restockHeader}>
            <Text style={styles.restockTitle}>{restockProduct?.name ?? 'Product'}</Text>
            <Text style={styles.restockMeta}>
              Add stock to the active branch with a single quantity update.
            </Text>
          </View>
          <Input
            label="How many to add?"
            value={restockQuantity}
            onChangeText={setRestockQuantity}
            keyboardType="numeric"
            autoFocus
          />
          <View style={styles.restockActions}>
            <Button label="Cancel" variant="ghost" onPress={closeRestock} fullWidth={false} />
            <Button label="Add stock" onPress={handleRestock} loading={restockLoading} />
          </View>
        </View>
      </ModalSheet>
      <ComingSoonSheet
        visible={scanSoonVisible}
        title="Barcode scanner"
        message="Scanner is coming soon. Enter SKU or barcode manually."
        onClose={() => setScanSoonVisible(false)}
      />
      <Toast message={toastMessage} visible={toastMessage !== null} />
      {role === 'owner' || showCartFab ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={role === 'owner' ? 'Add product' : 'Open cart'}
          onPress={() => (role === 'owner' ? navigation.navigate('AddProduct') : setCartVisible(true))}
          style={({ pressed }) => [
            styles.fab,
            role === 'owner' ? styles.fabCompact : styles.fabWide,
            pressed && styles.fabPressed,
          ]}
        >
          <Text style={styles.fabGlyph}>{role === 'owner' ? '＋' : '🛒'}</Text>
          <Text style={styles.fabLabel}>
            {role === 'owner'
              ? 'Add product'
              : `${items.length} item${items.length === 1 ? '' : 's'} · ${formatCurrency(total)}`}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  screenContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    gap: 0,
  },
  listHeader: {
    gap: dimensions.md,
    paddingBottom: dimensions.sm,
  },
  summaryLine: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  summaryStrong: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  summaryWarn: {
    color: colors.warning,
    fontWeight: '700',
  },
  summaryDanger: {
    color: colors.danger,
    fontWeight: '700',
  },
  columnWrapper: {
    gap: dimensions.cardGap,
  },
  gridCell: {
    flex: 1,
    maxWidth: '50%',
  },
  listContent: {
    paddingHorizontal: dimensions.screenPaddingH,
    paddingTop: dimensions.screenPaddingV,
    paddingBottom: dimensions.xl + 96,
    gap: dimensions.cardGap,
  },
  restockSheet: {
    gap: dimensions.md,
  },
  restockHeader: {
    gap: dimensions.xs,
  },
  restockTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  restockMeta: {
    ...typography.body,
    color: colors.textMuted,
  },
  restockActions: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  fab: {
    position: 'absolute',
    right: dimensions.screenPaddingH,
    bottom: dimensions.screenPaddingV,
    minHeight: 52,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.accent,
    alignItems: 'center',
    flexDirection: 'row',
    gap: dimensions.xs,
    paddingHorizontal: dimensions.lg,
    paddingVertical: dimensions.sm,
    shadowColor: colors.shadow,
    ...elevation.raised,
  },
  fabWide: {
    minWidth: 160,
    justifyContent: 'center',
  },
  fabCompact: {
    alignSelf: 'flex-start',
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  fabLabel: {
    color: colors.chipActiveText,
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  fabGlyph: {
    color: colors.chipActiveText,
    fontSize: 20,
    lineHeight: 22,
  },
});
