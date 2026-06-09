/**
 * Helpers to clean up products with invalid prices from the local database
 */

import { powersync as db } from '@/powersync';

const MAX_PRICE = 9999999999.99;

export async function cleanupInvalidProducts(): Promise<{
  deleted: number;
  found: number;
}> {
  try {
    // Find products with invalid prices
    const invalidProducts = await db.getAll<{
      id: string;
      name: string;
      selling_price?: number;
      cost_price?: number;
    }>(
      `SELECT id, name, selling_price, cost_price FROM products 
       WHERE selling_price > ? OR selling_price < 0 
          OR cost_price > ? OR cost_price < 0 
          OR selling_price IS NULL OR cost_price IS NULL`,
      [MAX_PRICE, MAX_PRICE],
    );

    const invalidProductIds: string[] = [];

    for (const product of invalidProducts) {
      console.warn(
        `[db] found product with invalid prices: ${product.name} (${product.id}) ` +
          `selling_price=${product.selling_price}, cost_price=${product.cost_price}`,
      );
      invalidProductIds.push(product.id);
    }

    // Delete products with invalid prices to prevent upload errors
    let deleted = 0;
    if (invalidProductIds.length > 0) {
      for (const productId of invalidProductIds) {
        await db.execute('DELETE FROM products WHERE id = ?', [productId]);
        deleted++;
      }
      console.log(`[db] deleted ${deleted} products with invalid prices`);
    }

    return {
      found: invalidProducts.length,
      deleted,
    };
  } catch (error) {
    console.error('[db] error cleaning up invalid products:', error);
    return { found: 0, deleted: 0 };
  }
}

export async function validateProductPricesInMemory(
  products: Array<{
    id: string;
    name?: string;
    selling_price?: number | string;
    cost_price?: number | string;
  }>,
): Promise<boolean> {
  let hasInvalid = false;

  for (const product of products) {
    const sellingPrice = typeof product.selling_price === 'string' 
      ? Number(product.selling_price) 
      : product.selling_price;
    const costPrice = typeof product.cost_price === 'string' 
      ? Number(product.cost_price) 
      : product.cost_price;

    if (
      sellingPrice === undefined ||
      costPrice === undefined ||
      !Number.isFinite(sellingPrice) ||
      !Number.isFinite(costPrice) ||
      sellingPrice < 0 ||
      costPrice < 0 ||
      sellingPrice > MAX_PRICE ||
      costPrice > MAX_PRICE
    ) {
      console.warn(
        `[db] invalid product prices: ${product.name} (${product.id}) ` +
          `selling_price=${sellingPrice}, cost_price=${costPrice}`,
      );
      hasInvalid = true;
    }
  }

  return !hasInvalid;
}
