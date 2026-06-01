import { useMemo } from 'react';

import { useQuery } from '@powersync/react';

import { getProductsForBusiness, findProductByBarcode, findProductById } from '@/db/queries/productQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { Product } from '@/types/models';

export function useProducts(searchTerm = '') {
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const role = useAuthStore((state) => state.role ?? 'employee');

  const { data: products } = useQuery<Product>(
    'SELECT * FROM products WHERE business_id = ?',
    [businessId],
  );
  const productRows = (products as Product[]) ?? [];

  const filteredProducts = useMemo(() => {
    if (!businessId) {
      return [];
    }

    return getProductsForBusiness(productRows, businessId, role, searchTerm);
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
