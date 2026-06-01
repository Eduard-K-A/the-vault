import type { InventoryRecord, Product } from '@/types/models';

export const INVENTORY_SQL = `
  SELECT *
  FROM inventory_items
  WHERE branch_id = ?;
`;

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
