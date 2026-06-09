import { useMemo } from 'react';

import { useQuery } from '@powersync/react';

import {
  buildProductsForBusinessQuery,
  getProductsForBusiness,
  findProductByBarcode,
  findProductById,
} from '@/db/queries/productQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { Product } from '@/types/models';

export function useProducts(searchTerm = '') {
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const role = useAuthStore((state) => state.role ?? 'employee');
  const productQuery = useMemo(() => buildProductsForBusinessQuery(businessId), [businessId]);

  const { data: products } = useQuery<Product>(
    productQuery.sql,
    productQuery.parameters,
  );
  const productRows = (products as Product[]) ?? [];

  const filteredProducts = useMemo(() => {
    if (!businessId) {
      return [];
    }

    const filtered = getProductsForBusiness(productRows, businessId, role, searchTerm);

    // Log warnings about inactive/archived products for debugging
    const allBusinessProducts = productRows.filter(p => p.business_id === businessId);
    const inactiveCount = allBusinessProducts.filter(p => !p.is_active).length;
    const archivedCount = allBusinessProducts.filter(p => p.is_archived).length;

    if (inactiveCount > 0 || archivedCount > 0) {
      console.log(
        `[inventory] Business ${businessId} has ${inactiveCount} inactive and ${archivedCount} archived products ` +
        `(${filtered.length} active products shown)`
      );
    }

    return filtered;
  }, [businessId, productRows, role, searchTerm]);

  const findByBarcodeLookup = useMemo(() => {
    return (barcode: string) => {
      if (!businessId) {
        return null;
      }
      return findProductByBarcode(productRows, businessId, barcode, role);
    };
  }, [businessId, productRows, role]);

  return {
    products: filteredProducts,
    findByBarcode: findByBarcodeLookup,
    findById: (productId: string) => findProductById(productRows, productId),
  };
}
