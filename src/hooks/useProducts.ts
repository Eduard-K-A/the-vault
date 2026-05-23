import { useMemo, useSyncExternalStore } from 'react';

import { usePowerSyncQuery } from '@/db/powersync';
import { getLocalDbState, getVersion, subscribe } from '@/db/localDb';
import { getProductsForBusiness, findProductByBarcode, findProductById } from '@/db/queries/productQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';

export function useProducts(searchTerm = '') {
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const role = useAuthStore((state) => state.role ?? 'employee');

  const { data: products } = usePowerSyncQuery(
    'SELECT * FROM products WHERE business_id = ?',
    [businessId, searchTerm, role],
    {
      selector: (state) => {
        if (!businessId) {
          return [];
        }
        return getProductsForBusiness(state, businessId, role, searchTerm);
      },
    },
  );

  useSyncExternalStore(subscribe, getVersion, getVersion);

  const findByBarcodeLookup = useMemo(() => {
    return (barcode: string) => {
      if (!businessId) {
        return null;
      }
      return findProductByBarcode(getLocalDbState(), businessId, barcode, role);
    };
  }, [businessId, role]);

  return {
    products,
    findByBarcode: findByBarcodeLookup,
    findById: (productId: string) => findProductById(getLocalDbState(), productId),
  };
}

