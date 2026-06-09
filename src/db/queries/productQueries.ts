import type { Product, UserRole } from '@/types/models';

export const PRODUCT_SEARCH_SQL = 'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY updated_at DESC';

const NO_ACTIVE_BUSINESS_ID = '__no_active_business__';

export function buildProductsForBusinessQuery(businessId: string | null): {
  sql: string;
  parameters: [string];
} {
  return {
    sql: PRODUCT_SEARCH_SQL,
    parameters: [businessId ?? NO_ACTIVE_BUSINESS_ID],
  };
}

export function getProductsForBusiness(
  products: Product[],
  businessId: string,
  role: UserRole,
  searchTerm = '',
): Product[] {
  const needle = searchTerm.trim().toLowerCase();
  const businessProducts = products.filter((product) => product.business_id === businessId);

  // Log diagnostic information if no products found
  if (businessProducts.length === 0 && products.length > 0) {
    const otherBusinessIds = Array.from(new Set(products.map(p => p.business_id)));
    console.warn(
      `[inventory] No products found for business ${businessId}. ` +
      `Total products in DB: ${products.length}, other business IDs present: ${otherBusinessIds.join(', ')}`
    );
  } else if (businessProducts.length > 0) {
    console.log(`[inventory] Found ${businessProducts.length} products for business ${businessId}`);
  }

  return businessProducts
    .filter((product) => (role === 'employee' ? product.is_active : true))
    .filter((product) => {
      if (!needle) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(needle) ||
        (product.barcode?.toLowerCase().includes(needle) ?? false) ||
        (product.sku?.toLowerCase().includes(needle) ?? false)
      );
    })
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export function findProductByBarcode(
  products: Product[],
  businessId: string,
  barcode: string,
  role: UserRole,
): Product | null {
  const product = products.find((entry) => {
    if (entry.business_id !== businessId) {
      return false;
    }

    if (role === 'employee' && !entry.is_active) {
      return false;
    }

    return entry.barcode === barcode;
  });

  return product ?? null;
}

export function findProductById(products: Product[], productId: string): Product | null {
  return products.find((entry) => entry.id === productId) ?? null;
}
