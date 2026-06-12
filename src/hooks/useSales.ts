import { useQuery } from '@powersync/react';
import {
  buildSaleItemsForBusinessQuery,
  buildSalesForBusinessQuery,
  getSaleById,
  getSaleItemsBySaleId,
  getSalesForBusiness,
  getSalesForEmployee,
} from '@/db/queries/salesQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { Sale, SaleItem } from '@/types/models';

export function useSales() {
  const userId = useAuthStore((state) => state.userId);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const role = useAuthStore((state) => state.role);

  const salesQuery = buildSalesForBusinessQuery(businessId);
  const saleItemsQuery = buildSaleItemsForBusinessQuery(businessId);
  const { data: sales } = useQuery<Sale>(salesQuery.sql, salesQuery.parameters);
  const { data: saleItems } = useQuery<SaleItem>(saleItemsQuery.sql, saleItemsQuery.parameters);
  const saleRows = (sales as Sale[]) ?? [];
  const saleItemRows = (saleItems as SaleItem[]) ?? [];

  return {
    sales:
      !userId || !businessId
        ? []
        : role === 'owner'
          ? getSalesForBusiness(saleRows, businessId)
          : getSalesForEmployee(saleRows, userId),
    findSale: (saleId: string) =>
      getSaleById(saleRows, saleId),
    findSaleItems: (saleId: string) =>
      getSaleItemsBySaleId(saleItemRows, saleId),
  };
}
