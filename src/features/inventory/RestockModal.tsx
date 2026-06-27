import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Button, Card, Screen, StatCard, Stepper } from '@/components/ui';
import { db } from '@/db/powersync';
import { buildProductByIdQuery } from '@/db/queries/productQueries';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { InventoryRecord, Product } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<RootStackParamList, 'Restock'>['route'];

const QUICK_ADD = [5, 10, 25, 50];

export default function RestockModal() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const authUserId = useAuthStore((state) => state.userId);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const branchName = useBusinessStore((state) => state.activeBranch?.name ?? 'Main branch');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const productQuery = useMemo(() => buildProductByIdQuery(route.params.productId), [route.params.productId]);
  const { data: productRows } = useQuery<Product>(productQuery.sql, productQuery.parameters);
  const product = (productRows as Product[])[0] ?? null;

  const { data: inventoryRows } = useQuery<InventoryRecord>(
    'SELECT * FROM inventory_items WHERE product_id = ? AND branch_id = ?',
    [route.params.productId, branchId ?? '__none__'],
  );
  const currentStock = (inventoryRows as InventoryRecord[])[0]?.stock_quantity ?? 0;
  const projectedStock = currentStock + quantity;

  async function handleRestock() {
    if (!authUserId || !branchId) {
      return;
    }

    try {
      setLoading(true);
      await db.writeTransaction(async (tx) => {
        await tx.restockInventory({
          productId: route.params.productId,
          branchId,
          quantity,
          actorId: authUserId,
        });
      });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.popToTop();
      }
    } catch (error) {
      Alert.alert('Restock failed', error instanceof Error ? error.message : 'Unknown error');
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
    <Screen
      title="Restock"
      subtitle="Every stock change is logged."
      onBack={handleBack}
      scrollable
      contentStyle={styles.content}
    >
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Adding stock to</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{product?.name ?? 'Product'}</Text>
            <Text style={styles.heroMeta} numberOfLines={1}>{branchName}</Text>
          </View>
          <Badge label={`SKU ${product?.sku ?? '—'}`} tone="neutral" />
        </View>
      </Card>

      <View style={styles.stats}>
        <StatCard label="On hand" value={String(currentStock)} tone="primary" style={styles.statCard} compact />
        <StatCard label="Adding" value={`+${quantity}`} tone="accent" style={styles.statCard} compact />
        <StatCard label="New total" value={String(projectedStock)} tone="success" style={styles.statCard} compact />
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Quantity</Text>
        <View style={styles.stepperRow}>
          <Stepper
            value={quantity}
            onIncrement={() => setQuantity((value) => value + 1)}
            onDecrement={() => setQuantity((value) => Math.max(1, value - 1))}
            incrementLabel="Increase quantity"
            decrementLabel="Decrease quantity"
          />
        </View>
        <View style={styles.quickRow}>
          {QUICK_ADD.map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              accessibilityLabel={`Add ${amount}`}
              onPress={() => setQuantity((value) => value + amount)}
              style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
            >
              <Text style={styles.quickChipText}>+{amount}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Button label={`Add ${quantity} to stock`} onPress={handleRestock} loading={loading} />
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    gap: dimensions.lg,
    paddingBottom: dimensions.xl,
  },
  heroCard: {
    backgroundColor: colors.accentSubtle,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: dimensions.xxs,
  },
  heroLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  heroMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    flexBasis: 0,
  },
  card: {
    gap: dimensions.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  stepperRow: {
    alignItems: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  quickChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: dimensions.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    ...typography.bodyMedium,
    color: colors.accent,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
