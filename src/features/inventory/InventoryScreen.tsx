import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { formatCurrency } from '@/utils/formatCurrency';
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
  const { addItem, items, total } = useCart();

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
    Alert.alert('Added to cart', `${product.name} was added to the current sale.`);
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
        <Card style={[styles.metricCard, styles.totalCard]}>
          <View style={styles.metricTopRow}>
            <Text style={styles.metricGlyph}>▦</Text>
            <Text style={styles.metricLabel}>Products</Text>
          </View>
          <Text style={styles.metricValue}>{summary.total}</Text>
          <Text style={styles.metricFootnote}>Visible in this workspace</Text>
        </Card>
        <Card style={[styles.metricCard, styles.warningCard]}>
          <View style={styles.metricTopRow}>
            <Text style={styles.metricGlyphWarning}>◔</Text>
            <Text style={styles.metricLabelWarning}>Low stock</Text>
          </View>
          <Text style={styles.metricValueWarning}>{summary.lowStock}</Text>
          <Text style={styles.metricFootnoteWarning}>Needs replenishment soon</Text>
        </Card>
        <Card style={[styles.metricCard, styles.dangerCard]}>
          <View style={styles.metricTopRow}>
            <Text style={styles.metricGlyphDanger}>⚠</Text>
            <Text style={styles.metricLabelDanger}>Out of stock</Text>
          </View>
          <Text style={styles.metricValueDanger}>{summary.outOfStock}</Text>
          <Text style={styles.metricFootnoteDanger}>Unavailable for checkout</Text>
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
        <View style={styles.fabCopy}>
          <Text style={styles.fabLabel}>{role === 'owner' ? 'Add product' : 'Open cart'}</Text>
          <Text style={styles.fabMeta}>
            {role === 'owner'
              ? 'Create or edit inventory'
              : `${items.length} item${items.length === 1 ? '' : 's'} • ${formatCurrency(total)}`}
          </Text>
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
  summaryStrip: {
    flexDirection: 'row',
    gap: dimensions.sm,
    overflow: 'hidden',
    marginTop: dimensions.xs,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 104,
    minHeight: 124,
    justifyContent: 'space-between',
    gap: dimensions.xs,
    borderRadius: dimensions.radiusMd,
  },
  totalCard: {
    backgroundColor: '#F7F6FF',
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  metricGlyph: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metricValue: {
    ...typography.title,
    color: colors.text,
  },
  metricFootnote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: '#FCD34D',
  },
  metricGlyphWarning: {
    color: '#B45309',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerCard: {
    backgroundColor: '#FDE8E8',
    borderColor: '#FCA5A5',
  },
  metricGlyphDanger: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabelWarning: {
    ...typography.label,
    color: '#9A3412',
    textTransform: 'uppercase',
  },
  metricValueWarning: {
    ...typography.title,
    color: '#B45309',
  },
  metricFootnoteWarning: {
    ...typography.caption,
    color: '#9A3412',
  },
  metricLabelDanger: {
    ...typography.label,
    color: '#991B1B',
    textTransform: 'uppercase',
  },
  metricValueDanger: {
    ...typography.title,
    color: '#B91C1C',
  },
  metricFootnoteDanger: {
    ...typography.caption,
    color: '#991B1B',
  },
  searchCard: {
    padding: dimensions.md,
    marginTop: dimensions.xs,
  },
  listContent: {
    gap: dimensions.md,
    paddingBottom: dimensions.xl + 96,
  },
  fab: {
    position: 'absolute',
    right: dimensions.screenPaddingH,
    bottom: dimensions.screenPaddingV + 56,
    minHeight: 60,
    borderRadius: dimensions.radiusXl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingHorizontal: dimensions.md,
    paddingVertical: dimensions.sm,
    minWidth: 182,
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
  fabCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: dimensions.sm,
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
