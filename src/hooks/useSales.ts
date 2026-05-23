import { usePowerSyncQuery } from '@/db/powersync';
import { getLocalDbState } from '@/db/localDb';
import { getSaleById, getSaleItemsBySaleId, getSalesForBusiness, getSalesForEmployee } from '@/db/queries/salesQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';

export function useSales() {
  const userId = useAuthStore((state) => state.userId);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);

  const { data: sales } = usePowerSyncQuery(
    'SELECT * FROM sales',
    [userId, businessId],
    {
      selector: (state) => {
        if (!userId || !businessId) {
          return [];
        }

        const role = useAuthStore.getState().role;
        return role === 'owner' ? getSalesForBusiness(state, businessId) : getSalesForEmployee(state, userId);
      },
    },
  );

  return {
    sales,
    findSale: (saleId: string) => getSaleById(getLocalDbState(), saleId),
    findSaleItems: (saleId: string) => getSaleItemsBySaleId(getLocalDbState(), saleId),
  };
}

