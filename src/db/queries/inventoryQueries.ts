import type { InventoryRecord, Product } from '@/types/models';

export const INVENTORY_SQL = `
  SELECT *
  FROM inventory_items
  WHERE branch_id = ?;
`;

const NO_ACTIVE_BRANCH_ID = '__no_active_branch__';

export const INVENTORY_FOR_BRANCH_SQL =
  'SELECT * FROM inventory_items WHERE branch_id = ? UNION ALL SELECT fallback_inventory_items.* FROM fallback_inventory_items WHERE branch_id = ? AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = fallback_inventory_items.id)';

export function buildInventoryForBranchQuery(branchId: string | null): {
  sql: string;
  parameters: [string, string];
} {
  const branch = branchId ?? NO_ACTIVE_BRANCH_ID;
  return {
    sql: INVENTORY_FOR_BRANCH_SQL,
    parameters: [branch, branch],
  };
}

export function getInventoryForBranch(inventory: InventoryRecord[], branchId: string): InventoryRecord[] {
  return inventory
    .filter((entry) => entry.branch_id === branchId)
    .sort((left, right) => left.stock_quantity - right.stock_quantity);
}

export function getLowStockProducts(
  inventory: InventoryRecord[],
  products: Product[],
  branchId: string,
): Array<InventoryRecord & { product: Product }> {
  return inventory
    .filter((entry) => entry.branch_id === branchId && entry.stock_quantity <= entry.low_stock_threshold)
    .map((entry) => ({
      ...entry,
      product: products.find((product) => product.id === entry.product_id)!,
    }))
    .filter((entry) => Boolean(entry.product))
    .sort((left, right) => left.stock_quantity - right.stock_quantity);
}

export function getInventoryRecord(
  inventory: InventoryRecord[],
  productId: string,
  branchId: string,
): InventoryRecord | null {
  return inventory.find((entry) => entry.product_id === productId && entry.branch_id === branchId) ?? null;
}
