import { generateUUID } from '@/utils/generateUUID';
import type { LocalDbState } from '@/db/localDb';
import type { PaymentMethod, Sale, SaleItem } from '@/types/models';
import { createSale as createSaleRecord } from '@/db/localDb';

export const EMPLOYEE_SALES_SQL = `
  SELECT *
  FROM sales
  WHERE employee_id = ? AND status = 'completed'
  ORDER BY created_at DESC;
`;

export const OWNER_SALES_SQL = `
  SELECT *
  FROM sales
  WHERE business_id = ? AND status = 'completed'
  ORDER BY created_at DESC;
`;

export function getSaleById(state: LocalDbState, saleId: string): Sale | null {
  return state.sales.find((entry) => entry.id === saleId) ?? null;
}

export function getSaleItemsBySaleId(state: LocalDbState, saleId: string): SaleItem[] {
  return state.saleItems.filter((entry) => entry.sale_id === saleId);
}

export function getSalesForEmployee(state: LocalDbState, employeeId: string): Sale[] {
  return state.sales
    .filter((sale) => sale.employee_id === employeeId && sale.status === 'completed')
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function getSalesForBusiness(state: LocalDbState, businessId: string): Sale[] {
  return state.sales
    .filter((sale) => sale.business_id === businessId && sale.status === 'completed')
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export function getSalesForEmployeeByPeriod(
  state: LocalDbState,
  employeeId: string,
  period: 'day' | 'week' | 'month',
): Sale[] {
  return getSalesForEmployee(state, employeeId).filter((sale) => {
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

export function createSaleFromCart(input: {
  state: LocalDbState;
  businessId: string;
  branchId: string;
  employeeId: string;
  paymentMethod: PaymentMethod;
  discountAmount: number;
  note: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}): Sale {
  const now = new Date().toISOString();
  const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const sale: Sale = {
    id: generateUUID(),
    business_id: input.businessId,
    branch_id: input.branchId,
    employee_id: input.employeeId,
    total_amount: Math.max(0, totalAmount - input.discountAmount),
    discount_amount: input.discountAmount,
    payment_method: input.paymentMethod,
    status: 'completed',
    notes: input.note.trim() ? input.note : null,
    created_at: now,
    synced_at: null,
  };

  const saleItems: SaleItem[] = input.items.map((item) => ({
    id: generateUUID(),
    sale_id: sale.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
  }));

  createSaleRecord({
    sale,
    items: saleItems,
    actorId: input.employeeId,
  });

  return sale;
}

function getWeekKey(value: Date): string {
  const firstDay = new Date(value.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((value.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + firstDay.getDay() + 1) / 7);
  return `${value.getFullYear()}-${week}`;
}

