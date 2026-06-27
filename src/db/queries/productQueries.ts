import type { Product, UserRole } from '@/types/models';

export const PRODUCT_SEARCH_SQL =
  'SELECT * FROM products WHERE business_id = ? AND is_active = 1 UNION ALL SELECT fallback_products.* FROM fallback_products WHERE business_id = ? AND is_active = 1 AND NOT EXISTS (SELECT 1 FROM products WHERE products.id = fallback_products.id) ORDER BY updated_at DESC';

const NO_ACTIVE_BUSINESS_ID = '__no_active_business__';

export const PRODUCT_BY_ID_SQL =
  'SELECT * FROM products WHERE id = ? UNION ALL SELECT fallback_products.* FROM fallback_products WHERE id = ? AND NOT EXISTS (SELECT 1 FROM products WHERE products.id = fallback_products.id)';

export function buildProductByIdQuery(productId: string): {
  sql: string;
  parameters: [string, string];
} {
  return {
    sql: PRODUCT_BY_ID_SQL,
    parameters: [productId, productId],
  };
}

export function buildProductsForBusinessQuery(businessId: string | null): {
  sql: string;
  parameters: [string, string];
} {
  const business = businessId ?? NO_ACTIVE_BUSINESS_ID;
  return {
    sql: PRODUCT_SEARCH_SQL,
    parameters: [business, business],
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
