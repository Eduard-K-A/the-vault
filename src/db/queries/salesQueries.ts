import type { Payment, Sale, SaleItem } from '@/types/models';

const NO_ACTIVE_BUSINESS = '__no_active_business__';

export const EMPLOYEE_SALES_SQL = `
  SELECT *
  FROM sales
  WHERE employee_id = ? AND status = 'completed'
  ORDER BY created_at DESC;
`;

export function buildSalesForBusinessQuery(businessId: string | null): { sql: string; parameters: string[] } {
  const scopedBusinessId = businessId ?? NO_ACTIVE_BUSINESS;

  return {
    sql:
      'SELECT * FROM sales WHERE business_id = ? UNION ALL SELECT fallback_sales.* FROM fallback_sales WHERE business_id = ? AND NOT EXISTS (SELECT 1 FROM sales WHERE sales.id = fallback_sales.id) ORDER BY created_at DESC',
    parameters: [scopedBusinessId, scopedBusinessId],
  };
}

export function buildSaleItemsForBusinessQuery(businessId: string | null): { sql: string; parameters: string[] } {
  const scopedBusinessId = businessId ?? NO_ACTIVE_BUSINESS;

  return {
    sql:
      'SELECT * FROM sale_items WHERE business_id = ? UNION ALL SELECT fallback_sale_items.* FROM fallback_sale_items WHERE business_id = ? AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_items.id = fallback_sale_items.id)',
    parameters: [scopedBusinessId, scopedBusinessId],
  };
}

export function buildPaymentsForBusinessQuery(businessId: string | null): { sql: string; parameters: string[] } {
  const scopedBusinessId = businessId ?? NO_ACTIVE_BUSINESS;

  return {
    sql:
      'SELECT * FROM payments WHERE business_id = ? UNION ALL SELECT fallback_payments.* FROM fallback_payments WHERE business_id = ? AND NOT EXISTS (SELECT 1 FROM payments WHERE payments.id = fallback_payments.id)',
    parameters: [scopedBusinessId, scopedBusinessId],
  };
}

export const OWNER_SALES_SQL = `
  SELECT *
  FROM sales
  WHERE business_id = ? AND status = 'completed'
  ORDER BY created_at DESC;
`;

export function getSaleById(sales: Sale[], saleId: string): Sale | null {
  return sales.find((entry) => entry.id === saleId) ?? null;
}

export function getSaleItemsBySaleId(saleItems: SaleItem[], saleId: string): SaleItem[] {
  return saleItems.filter((entry) => entry.sale_id === saleId);
}

export function getSalesForEmployee(sales: Sale[], employeeId: string): Sale[] {
  return sales
    .filter((sale) => sale.employee_id === employeeId && sale.status === 'completed')
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function getSalesForBusiness(sales: Sale[], businessId: string): Sale[] {
  return sales
    .filter((sale) => sale.business_id === businessId && sale.status === 'completed')
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function getSalesForEmployeeByPeriod(
  sales: Sale[],
  employeeId: string,
  period: 'day' | 'week' | 'month',
): Sale[] {
  return getSalesForEmployee(sales, employeeId).filter((sale) => {
    const saleDate = new Date(sale.created_at);
    const now = new Date();

    if (period === 'day') {
      return saleDate.toDateString() === now.toDateString();
    }

    if (period === 'week') {
      return getWeekKey(saleDate) === getWeekKey(now);
    }

    return `${saleDate.getMonth()}-${saleDate.getFullYear()}` === `${now.getMonth()}-${now.getFullYear()}`;
  });
}

export function createSaleReferenceNumber(businessId: string): string {
  const dayKey = `${businessId}:${new Date().toISOString().slice(0, 10)}`;
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TXN-${dayKey.slice(-10).replace(/-/g, '')}-${suffix}`;
}

export function buildSalePayments(
  sale: Sale,
  businessId: string,
  payments?: Array<{ method: Payment['method']; amount_peso: number }>,
): Payment[] {
  if (payments && payments.length > 0) {
    return payments.map((payment) => ({
      id: cryptoRandomId(),
      sale_id: sale.id,
      business_id: businessId,
      method: payment.method,
      amount_peso: roundMoney(payment.amount_peso),
    }));
  }

  return [
    {
      id: cryptoRandomId(),
      sale_id: sale.id,
      business_id: businessId,
      method: sale.payment_method,
      amount_peso: sale.total_amount,
    },
  ];
}

function getWeekKey(value: Date): string {
  const firstDay = new Date(value.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((value.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + firstDay.getDay() + 1) / 7);
  return `${value.getFullYear()}-${week}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function cryptoRandomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
