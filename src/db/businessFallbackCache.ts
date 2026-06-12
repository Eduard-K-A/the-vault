import { powersync } from '@/powersync';
import type { Branch, InventoryRecord, Payment, Product, Sale, SaleItem } from '@/types/models';

export interface BusinessFallbackSnapshot {
  branches?: Branch[];
  products?: Product[];
  inventory?: InventoryRecord[];
  sales?: Sale[];
  saleItems?: SaleItem[];
  payments?: Payment[];
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

function branchValues(branch: Branch & { created_at?: string; updated_at?: string }): unknown[] {
  const timestamp = new Date().toISOString();

  return [
    branch.id,
    branch.business_id,
    branch.name,
    branch.is_active ? 1 : 0,
    branch.created_at ?? timestamp,
    branch.updated_at ?? timestamp,
  ];
}

function saleValues(sale: Sale): unknown[] {
  return [
    sale.id,
    sale.business_id,
    sale.branch_id,
    sale.employee_id,
    sale.total_amount,
    sale.discount_amount,
    sale.payment_method,
    sale.status,
    sale.notes,
    sale.created_at,
    sale.synced_at,
    sale.reference_number ?? null,
    sale.vat_amount ?? null,
    sale.idempotency_key ?? null,
  ];
}

function saleItemValues(item: SaleItem & { business_id?: string | null }): unknown[] {
  return [
    item.id,
    item.sale_id,
    item.product_id,
    item.business_id ?? null,
    item.quantity,
    item.unit_price,
    item.subtotal,
  ];
}

function paymentValues(payment: Payment): unknown[] {
  return [
    payment.id,
    payment.sale_id,
    payment.business_id,
    payment.method,
    payment.amount_peso,
  ];
}

export async function applyBusinessFallbackCache(snapshot: BusinessFallbackSnapshot): Promise<void> {
  const businessId =
    snapshot.branches?.[0]?.business_id ??
    snapshot.products?.[0]?.business_id ??
    snapshot.inventory?.[0]?.business_id ??
    snapshot.sales?.[0]?.business_id ??
    snapshot.payments?.[0]?.business_id ??
    null;

  await powersync.writeTransaction(async (tx) => {
    if (businessId) {
      await tx.execute('DELETE FROM fallback_branches WHERE business_id = ?', [businessId]);
      await tx.execute('DELETE FROM fallback_products WHERE business_id = ?', [businessId]);
      await tx.execute('DELETE FROM fallback_inventory_items WHERE business_id = ?', [businessId]);
      await tx.execute('DELETE FROM fallback_sales WHERE business_id = ?', [businessId]);
      await tx.execute('DELETE FROM fallback_sale_items WHERE business_id = ?', [businessId]);
      await tx.execute('DELETE FROM fallback_payments WHERE business_id = ?', [businessId]);
    }

    for (const branch of snapshot.branches ?? []) {
      await tx.execute(
        'INSERT OR REPLACE INTO fallback_branches (id, business_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        branchValues(branch),
      );
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

    for (const sale of snapshot.sales ?? []) {
      await tx.execute(
        'INSERT OR REPLACE INTO fallback_sales (id, business_id, branch_id, employee_id, total_amount, discount_amount, payment_method, status, notes, created_at, synced_at, reference_number, vat_amount, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        saleValues(sale),
      );
    }

    for (const item of snapshot.saleItems ?? []) {
      await tx.execute(
        'INSERT OR REPLACE INTO fallback_sale_items (id, sale_id, product_id, business_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        saleItemValues(item),
      );
    }

    for (const payment of snapshot.payments ?? []) {
      await tx.execute(
        'INSERT OR REPLACE INTO fallback_payments (id, sale_id, business_id, method, amount_peso) VALUES (?, ?, ?, ?, ?)',
        paymentValues(payment),
      );
    }
  });
}
