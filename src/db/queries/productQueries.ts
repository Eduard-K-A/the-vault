import type { Product, UserRole } from '@/types/models';

export const PRODUCT_SEARCH_SQL = `
  SELECT *
  FROM products
  WHERE business_id = ? AND is_active = 1
  ORDER BY updated_at DESC;
`;

export function getProductsForBusiness(
  products: Product[],
  businessId: string,
  role: UserRole,
  searchTerm = '',
): Product[] {
  const needle = searchTerm.trim().toLowerCase();
  return products
    .filter((product) => product.business_id === businessId)
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
