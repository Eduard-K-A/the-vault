import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Button, Card, Input, ModalSheet, Screen, StatCard } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import CartSheet from '@/features/cart/CartSheet';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { refreshBusinessDataFromDatabase } from '@/services/businessDataRefresh.service';
import { formatCurrency } from '@/utils/formatCurrency';
import { db } from '@/db/powersync';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { InventoryRecord, Product } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function InventoryScreen() {
  const navigation = useNavigation<Navigation>();
  const fullname = useAuthStore((state) => state.fullname);
  const role = useAuthStore((state) => state.role);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const businessName = useBusinessStore((state) => state.activeBusiness?.name ?? 'Inventory');
  const [cartVisible, setCartVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('1');
  const [restockLoading, setRestockLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const { products, findByBarcode } = useProducts(search);
  const { addItem, items, total } = useCart();
  const { data: inventoryItems } = useQuery<InventoryRecord>(
    'SELECT * FROM inventory_items WHERE branch_id = ?',
    [branchId ?? ''],
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
    if (!businessId) {
      Alert.alert('Sync failed', 'Select a business before syncing.');
      return;
    }

    try {
      setSyncLoading(true);
      await syncPowerSyncNow();
      await refreshBusinessDataFromDatabase(businessId);
      setToastMessage('Sync completed');
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSyncLoading(false);
    }
  }

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

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
        <View style={styles.syncActionsRow}>
          <Button
            label="Sync now"
            variant="secondary"
            onPress={() => void handleManualSync()}
            loading={syncLoading}
            fullWidth={false}
          />
        </View>
      </View>

      <View style={styles.summaryStrip}>
        <StatCard label="Products" value={String(summary.total)} tone="primary" compact style={styles.metricCard} />
        <StatCard label="Low stock" value={String(summary.lowStock)} tone="warning" compact style={styles.metricCard} />
        <StatCard
          label="Out of stock"
          value={String(summary.outOfStock)}
          tone="accent"
          compact
          style={styles.metricCard}
        />
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
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.productBlock}>
              <ProductCard
                product={item}
                stockQuantity={inventoryByProductId.get(item.id)}
                onPress={
                  role === 'employee'
                    ? handleAdd
                    : () => navigation.navigate('EditProduct', { productId: item.id })
                }
                onAdd={role === 'owner' ? openRestock : undefined}
              />
            </View>
          )}
        />
      )}

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
      {toastMessage ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastLabel}>{toastMessage}</Text>
        </View>
      ) : null}
      <Pressable
        onPress={() => (role === 'owner' ? navigation.navigate('AddProduct') : setCartVisible(true))}
        style={({ pressed }) => [
          styles.fab,
          role === 'owner' ? styles.fabCompact : styles.fabWide,
          pressed && styles.fabPressed,
        ]}
      >
        <View style={role === 'owner' ? styles.fabCopyCompact : styles.fabCopy}>
          <Text style={styles.fabLabel}>{role === 'owner' ? 'Add product' : 'Open cart'}</Text>
          {role === 'owner' ? null : (
            <Text style={styles.fabMeta}>
              {`${items.length} item${items.length === 1 ? '' : 's'} • ${formatCurrency(total)}`}
            </Text>
          )}
        </View>
        <Text style={styles.fabGlyph}>{role === 'owner' ? '＋' : '🛒'}</Text>
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
  syncActionsRow: {
    alignItems: 'flex-start',
  },
  summaryStrip: {
    flexDirection: 'row',
    gap: dimensions.sm,
    overflow: 'hidden',
    marginTop: dimensions.xs,
    flexWrap: 'nowrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    flexBasis: 0,
  },
  searchCard: {
    padding: dimensions.md,
    marginTop: dimensions.xs,
  },
  productBlock: {
    gap: dimensions.xs,
  },
  listContent: {
    gap: dimensions.md,
    paddingBottom: dimensions.xl + 96,
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
  toast: {
    position: 'absolute',
    left: dimensions.screenPaddingH,
    right: dimensions.screenPaddingH,
    top: dimensions.screenPaddingV + 12,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.sm,
    borderRadius: dimensions.radiusFull,
    backgroundColor: 'rgba(25, 28, 30, 0.92)',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastLabel: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: dimensions.screenPaddingH,
    bottom: dimensions.screenPaddingV,
    minHeight: 60,
    borderRadius: dimensions.radiusXl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  fabWide: {
    minWidth: 182,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.sm,
  },
  fabCompact: {
    minWidth: 0,
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.sm,
    alignSelf: 'flex-start',
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  fabCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: dimensions.sm,
  },
  fabCopyCompact: {
    flex: 0,
    marginRight: dimensions.xs,
    width: 'auto',
  },
  fabLabel: {
    color: '#FFFFFF',
    ...typography.body,
    fontWeight: '700',
  },
  fabMeta: {
    ...typography.caption,
    color: '#DAD8FF',
    marginTop: 2,
  },
  fabGlyph: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 22,
  },
});
