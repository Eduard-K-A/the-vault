import type { LocalDbState } from '@/db/localDb';
import type { SaleMetrics } from '@/types/models';

export interface DailyTotal {
  day: string;
  total: number;
  transaction_count: number;
}

export interface ProductAggregate {
  product_id: string;
  name: string;
  total_qty: number;
  total_revenue: number;
}

export interface PaymentMethodBreakdown {
  payment_method: string;
  transaction_count: number;
  total_revenue: number;
}

export interface EmployeeLeaderboardEntry {
  employee_id: string;
  fullname: string;
  revenue: number;
  transactions: number;
}

export interface AnalyticsSummary {
  revenue: number;
  transactions: number;
  netRevenue: number;
}

export interface EmployeeAnalyticsResult {
  dailyTotals: DailyTotal[];
  monthlyTotal: number;
  weeklyTotal: number;
  todayTotal: number;
  topProducts: ProductAggregate[];
}

export interface OwnerAnalyticsResult {
  summary: SaleMetrics;
  leaderboard: EmployeeLeaderboardEntry[];
  topProducts: ProductAggregate[];
  lowStockProducts: Array<{
    product_id: string;
    name: string;
    stock_quantity: number;
    low_stock_threshold: number;
    stock_status: 'out_of_stock' | 'low_stock' | 'ok';
  }>;
  paymentBreakdown: PaymentMethodBreakdown[];
}

export function getEmployeeAnalytics(state: LocalDbState, employeeId: string): EmployeeAnalyticsResult {
  const completedSales = state.sales.filter(
    (sale) => sale.employee_id === employeeId && sale.status === 'completed',
  );
  const now = new Date();
  const todayTotal = sumSalesForDate(completedSales, now);
  const weeklyTotal = sumSalesForWeek(completedSales, now);
  const monthlyTotal = sumSalesForMonth(completedSales, now);
  const dailyTotals = getDailyTotals(completedSales, 6);
  const topProducts = getTopProducts(state, {
    saleFilter: (sale) => sale.employee_id === employeeId,
    limit: 5,
  });

  return {
    todayTotal,
    weeklyTotal,
    monthlyTotal,
    dailyTotals,
    topProducts,
  };
}

export function getOwnerAnalytics(state: LocalDbState, businessId: string, branchId: string): OwnerAnalyticsResult {
  const completedSales = state.sales.filter(
    (sale) => sale.business_id === businessId && sale.status === 'completed',
  );
  const today = new Date();
  const summary = {
    revenue: sumSalesForDate(completedSales, today),
    transactions: completedSales.filter((sale) => isSameDate(new Date(sale.created_at), today)).length,
    netRevenue: completedSales
      .filter((sale) => isSameDate(new Date(sale.created_at), today))
      .reduce((sum, sale) => sum + (sale.total_amount - sale.discount_amount), 0),
  };
  const leaderboard = getLeaderboard(state, businessId);
  const topProducts = getTopProducts(state, {
    saleFilter: (sale) => sale.business_id === businessId,
    limit: 10,
  });
  const lowStockProducts = state.inventory
    .filter((item) => item.branch_id === branchId && item.stock_quantity <= item.low_stock_threshold)
    .map((item) => ({
      product_id: item.product_id,
      name: state.products.find((product) => product.id === item.product_id)?.name ?? 'Unknown',
      stock_quantity: item.stock_quantity,
      low_stock_threshold: item.low_stock_threshold,
      stock_status:
        item.stock_quantity <= 0
          ? ('out_of_stock' as const)
          : item.stock_quantity <= item.low_stock_threshold
            ? ('low_stock' as const)
            : ('ok' as const),
    }))
    .sort((left, right) => left.stock_quantity - right.stock_quantity);
  const paymentBreakdown = getPaymentBreakdown(completedSales, nowKey());

  return {
    summary,
    leaderboard,
    topProducts,
    lowStockProducts,
    paymentBreakdown,
  };
}

function getDailyTotals(sales: Array<{ created_at: string; total_amount: number }>, daysBack: number): DailyTotal[] {
  const totals = new Map<string, DailyTotal>();
  const now = new Date();

  for (let offset = daysBack; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const key = date.toDateString();
    totals.set(key, {
      day: date.toISOString().slice(0, 10),
      total: 0,
      transaction_count: 0,
    });
  }

  sales.forEach((sale) => {
    const date = new Date(sale.created_at);
    const key = date.toDateString();
    const bucket = totals.get(key);
    if (!bucket) {
      return;
    }

    bucket.total += sale.total_amount;
    bucket.transaction_count += 1;
  });

  return [...totals.values()];
}

function getTopProducts(
  state: LocalDbState,
  options: { saleFilter: (sale: LocalDbState['sales'][number]) => boolean; limit: number },
): ProductAggregate[] {
  const totals = new Map<string, ProductAggregate>();

  state.saleItems.forEach((item) => {
    const sale = state.sales.find((entry) => entry.id === item.sale_id);
    if (!sale || !options.saleFilter(sale) || sale.status !== 'completed') {
      return;
    }

    const product = state.products.find((entry) => entry.id === item.product_id);
    if (!product) {
      return;
    }

    const current = totals.get(item.product_id) ?? {
      product_id: item.product_id,
      name: product.name,
      total_qty: 0,
      total_revenue: 0,
    };

    current.total_qty += item.quantity;
    current.total_revenue += item.subtotal;
    totals.set(item.product_id, current);
  });

  return [...totals.values()]
    .sort((left, right) => right.total_qty - left.total_qty)
    .slice(0, options.limit);
}

function getLeaderboard(state: LocalDbState, businessId: string): EmployeeLeaderboardEntry[] {
  const totals = new Map<string, EmployeeLeaderboardEntry>();
  const completedSales = state.sales.filter(
    (sale) => sale.business_id === businessId && sale.status === 'completed',
  );

  completedSales.forEach((sale) => {
    const profile = state.profiles.find((entry) => entry.id === sale.employee_id);
    if (!profile) {
      return;
    }

    const current = totals.get(sale.employee_id) ?? {
      employee_id: sale.employee_id,
      fullname: profile.fullname,
      revenue: 0,
      transactions: 0,
    };

    current.revenue += sale.total_amount;
    current.transactions += 1;
    totals.set(sale.employee_id, current);
  });

  return [...totals.values()].sort((left, right) => right.revenue - left.revenue);
}

function getPaymentBreakdown(
  sales: Array<{ payment_method: string; total_amount: number; created_at: string }>,
  _bucket: string,
): PaymentMethodBreakdown[] {
  const totals = new Map<string, PaymentMethodBreakdown>();

  sales.forEach((sale) => {
    const current = totals.get(sale.payment_method) ?? {
      payment_method: sale.payment_method,
      transaction_count: 0,
      total_revenue: 0,
    };
    current.transaction_count += 1;
    current.total_revenue += sale.total_amount;
    totals.set(sale.payment_method, current);
  });

  return [...totals.values()].sort((left, right) => right.total_revenue - left.total_revenue);
}

function sumSalesForDate(
  sales: Array<{ created_at: string; total_amount: number }>,
  date: Date,
): number {
  return sales
    .filter((sale) => isSameDate(new Date(sale.created_at), date))
    .reduce((sum, sale) => sum + sale.total_amount, 0);
}

function sumSalesForWeek(
  sales: Array<{ created_at: string; total_amount: number }>,
  date: Date,
): number {
  const weekKey = getWeekKey(date);
  return sales
    .filter((sale) => getWeekKey(new Date(sale.created_at)) === weekKey)
    .reduce((sum, sale) => sum + sale.total_amount, 0);
}

function sumSalesForMonth(
  sales: Array<{ created_at: string; total_amount: number }>,
  date: Date,
): number {
  return sales
    .filter(
      (sale) =>
        new Date(sale.created_at).getMonth() === date.getMonth() &&
        new Date(sale.created_at).getFullYear() === date.getFullYear(),
    )
    .reduce((sum, sale) => sum + sale.total_amount, 0);
}

function isSameDate(left: Date, right: Date): boolean {
  return left.toDateString() === right.toDateString();
}

function getWeekKey(date: Date): string {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + firstDay.getDay() + 1) / 7);
  return `${date.getFullYear()}-${week}`;
}

function nowKey(): string {
  return new Date().toISOString().slice(0, 10);
}

