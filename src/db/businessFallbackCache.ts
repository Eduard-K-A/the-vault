import { powersync } from '@/powersync';
import type { InventoryRecord, Product } from '@/types/models';

export interface BusinessFallbackSnapshot {
  products?: Product[];
  inventory?: InventoryRecord[];
}

function productValues(product: Product): unknown[] {
  return [
    product.id,
    product.business_id,
    product.category_id ?? null,
    product.name,
    product.barcode,
    product.sku,
    product.selling_price,
    product.cost_price,
    product.image_url,
    product.is_active ? 1 : 0,
    product.is_archived ? 1 : 0,
    product.version ?? 1,
    product.description ?? null,
    product.created_at,
    product.updated_at,
    (product as Product & { created_by?: string | null }).created_by ?? null,
    (product as Product & { last_modified_by?: string | null }).last_modified_by ?? null,
  ];
}

function inventoryValues(item: InventoryRecord): unknown[] {
  return [
    item.id,
    item.product_id,
    item.branch_id,
    item.business_id ?? null,
    item.stock_quantity,
    item.low_stock_threshold,
    item.updated_at,
  ];
}

export async function applyBusinessFallbackCache(snapshot: BusinessFallbackSnapshot): Promise<void> {
  const businessId = snapshot.products?.[0]?.business_id ?? snapshot.inventory?.[0]?.business_id ?? null;

  await powersync.writeTransaction(async (tx) => {
    if (businessId) {
      await tx.execute('DELETE FROM fallback_products WHERE business_id = ?', [businessId]);
      await tx.execute('DELETE FROM fallback_inventory_items WHERE business_id = ?', [businessId]);
    }

    for (const product of snapshot.products ?? []) {
      await tx.execute(
        'INSERT OR REPLACE INTO fallback_products (id, business_id, category_id, name, barcode, sku, selling_price, cost_price, image_url, is_active, is_archived, version, description, created_at, updated_at, created_by, last_modified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        productValues(product),
      );
    }

    for (const item of snapshot.inventory ?? []) {
      await tx.execute(
        'INSERT OR REPLACE INTO fallback_inventory_items (id, product_id, branch_id, business_id, stock_quantity, low_stock_threshold, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        inventoryValues(item),
      );
    }
  });
}
