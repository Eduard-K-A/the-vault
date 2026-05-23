import type { LocalDbState } from '@/db/localDb';
import type { InventoryRecord, Product } from '@/types/models';

export const INVENTORY_SQL = `
  SELECT *
  FROM inventory
  WHERE branch_id = ?;
`;

export function getInventoryForBranch(state: LocalDbState, branchId: string): InventoryRecord[] {
  return state.inventory
    .filter((entry) => entry.branch_id === branchId)
    .sort((left, right) => left.stock_quantity - right.stock_quantity);
}

export function getLowStockProducts(
  state: LocalDbState,
  branchId: string,
): Array<InventoryRecord & { product: Product }> {
  return state.inventory
    .filter((entry) => entry.branch_id === branchId && entry.stock_quantity <= entry.low_stock_threshold)
    .map((entry) => ({
      ...entry,
      product: state.products.find((product) => product.id === entry.product_id)!,
    }))
    .filter((entry) => Boolean(entry.product))
    .sort((left, right) => left.stock_quantity - right.stock_quantity);
}

export function getInventoryRecord(
  state: LocalDbState,
  productId: string,
  branchId: string,
): InventoryRecord | null {
  return (
    state.inventory.find((entry) => entry.product_id === productId && entry.branch_id === branchId) ?? null
  );
}

