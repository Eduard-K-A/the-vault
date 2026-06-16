import type { InventoryLog, InventoryRecord, Payment, Product, Sale, SaleItem } from '@/types/models';

interface LoadFixtureOptions {
  businessId: string;
  branchId: string;
  employeeId: string;
  productCount: number;
  saleCount: number;
  inventoryLogDays: number;
}

interface LoadFixtureDataset {
  products: Product[];
  inventory: InventoryRecord[];
  sales: Sale[];
  saleItems: SaleItem[];
  payments: Payment[];
  inventoryLogs: InventoryLog[];
}

function pad(value: number): string {
  return String(value).padStart(4, '0');
}

function timestamp(dayOffset: number): string {
  const date = new Date(Date.UTC(2026, 0, 1 + dayOffset, 8, 0, 0));
  return date.toISOString();
}

export function createLoadFixtureDataset(options: LoadFixtureOptions): LoadFixtureDataset {
  const products: Product[] = Array.from({ length: options.productCount }, (_, index) => {
    const sequence = index + 1;
    return {
      id: `load-product-${pad(sequence)}`,
      business_id: options.businessId,
      category_id: null,
      name: `Load Product ${pad(sequence)}`,
      barcode: `LOAD${pad(sequence)}`,
      sku: `LOAD-SKU-${pad(sequence)}`,
      selling_price: 50 + (sequence % 100),
      cost_price: 25 + (sequence % 50),
      image_url: null,
      is_active: true,
      created_at: timestamp(0),
      updated_at: timestamp(0),
      version: 1,
      is_archived: false,
      description: null,
    };
  });

  const inventory: InventoryRecord[] = products.map((product, index) => ({
    id: `load-inventory-${pad(index + 1)}`,
    product_id: product.id,
    branch_id: options.branchId,
    business_id: options.businessId,
    stock_quantity: 100 + (index % 25),
    low_stock_threshold: 10,
    updated_at: timestamp(0),
  }));

  const sales: Sale[] = Array.from({ length: options.saleCount }, (_, index) => {
    const sequence = index + 1;
    const product = products[index % Math.max(1, products.length)];
    const total = product?.selling_price ?? 50;
    return {
      id: `load-sale-${pad(sequence)}`,
      business_id: options.businessId,
      branch_id: options.branchId,
      employee_id: options.employeeId,
      total_amount: total,
      discount_amount: 0,
      payment_method: 'cash',
      status: 'completed',
      notes: null,
      created_at: timestamp(index % 30),
      synced_at: timestamp(index % 30),
      reference_number: `LOAD-TXN-${pad(sequence)}`,
      vat_amount: Math.round((total - total / 1.12) * 100) / 100,
      idempotency_key: `load-idem-${pad(sequence)}`,
      sync_status: 'synced',
      sync_attempt_count: 1,
      last_sync_error_code: null,
      last_sync_error_message: null,
      last_sync_error_at: null,
      last_sync_attempt_at: timestamp(index % 30),
      server_confirmed_at: timestamp(index % 30),
    };
  });

  const saleItems: SaleItem[] = sales.map((sale, index) => {
    const product = products[index % Math.max(1, products.length)];
    return {
      id: `load-sale-item-${pad(index + 1)}`,
      sale_id: sale.id,
      product_id: product?.id ?? 'load-product-0000',
      quantity: 1,
      unit_price: sale.total_amount,
      subtotal: sale.total_amount,
    };
  });

  const payments: Payment[] = sales.map((sale, index) => ({
    id: `load-payment-${pad(index + 1)}`,
    sale_id: sale.id,
    business_id: options.businessId,
    branch_id: options.branchId,
    method: 'cash',
    amount_peso: sale.total_amount,
    status: 'paid',
    provider: 'cash',
    provider_reference: null,
    offline_approved: true,
    created_at: sale.created_at,
    synced_at: sale.synced_at,
  }));

  const inventoryLogs: InventoryLog[] = Array.from({ length: options.inventoryLogDays }, (_, index) => ({
    id: `load-inventory-log-${pad(index + 1)}`,
    business_id: options.businessId,
    product_id: products[index % Math.max(1, products.length)]?.id ?? 'load-product-0000',
    branch_id: options.branchId,
    action_type: 'sale',
    quantity_before: 100,
    quantity_changed: -1,
    quantity_after: 99,
    reference_type: 'sale',
    reference_id: sales[index % Math.max(1, sales.length)]?.id ?? null,
    reason: 'load test sale movement',
    performed_by: options.employeeId,
    created_at: timestamp(index),
    synced_at: timestamp(index),
  }));

  return {
    products,
    inventory,
    sales,
    saleItems,
    payments,
    inventoryLogs,
  };
}
