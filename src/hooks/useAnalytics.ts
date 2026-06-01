import { useQuery } from '@powersync/react';
import { getEmployeeAnalytics, getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type {
  AuditLog,
  Business,
  BusinessMember,
  Branch,
  Category,
  InventoryRecord,
  Payment,
  Profile,
  Product,
  Refund,
  RefundItem,
  Sale,
  SaleItem,
} from '@/types/models';

export function useAnalytics() {
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.userId);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);

  const { data: profiles } = useQuery<Profile>('SELECT * FROM profiles');
  const { data: businesses } = useQuery<Business>('SELECT * FROM businesses');
  const { data: businessMembers } = useQuery<BusinessMember>('SELECT * FROM business_members');
  const { data: branches } = useQuery<Branch>('SELECT * FROM branches');
  const { data: categories } = useQuery<Category>('SELECT * FROM categories');
  const { data: products } = useQuery<Product>('SELECT * FROM products');
  const { data: inventory } = useQuery<InventoryRecord>('SELECT * FROM inventory_items');
  const { data: sales } = useQuery<Sale>('SELECT * FROM sales');
  const { data: saleItems } = useQuery<SaleItem>('SELECT * FROM sale_items');
  const { data: payments } = useQuery<Payment>('SELECT * FROM payments');
  const { data: refunds } = useQuery<Refund>('SELECT * FROM refunds');
  const { data: refundItems } = useQuery<RefundItem>('SELECT * FROM refund_items');
  const { data: auditLogs } = useQuery<AuditLog>('SELECT * FROM audit_logs');

  const state = {
    profiles: profiles as Profile[],
    businesses: businesses as Business[],
    businessMembers: businessMembers as BusinessMember[],
    branches: branches as Branch[],
    categories: categories as Category[],
    products: products as Product[],
    inventory: inventory as InventoryRecord[],
    sales: sales as Sale[],
    saleItems: saleItems as SaleItem[],
    payments: payments as Payment[],
    refunds: refunds as Refund[],
    refundItems: refundItems as RefundItem[],
    inventoryLogs: [],
    auditLogs: auditLogs as AuditLog[],
  };

  const data =
    role === 'owner' && businessId && branchId
      ? getOwnerAnalytics(state, businessId, branchId)
      : role === 'employee' && userId
        ? getEmployeeAnalytics(state, userId)
        : null;

  return {
    analytics: data,
  };
}
