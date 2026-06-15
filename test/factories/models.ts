import type {
  AuditLog,
  Branch,
  Business,
  BusinessMember,
  CartItem,
  Category,
  InventoryLog,
  InventoryRecord,
  Payment,
  Product,
  Profile,
  Refund,
  Sale,
  SaleItem,
  UserRole,
} from '@/types/models';
import type { SyncPhase } from '@/types/sync';

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export function resetFactorySequence(): void {
  sequence = 0;
}

export function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: nextId('profile'),
    fullname: 'Test User',
    email: 'user@example.com',
    role: 'employee',
    phone_number: null,
    avatar_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: nextId('business'),
    name: 'Test Business',
    owner_id: 'owner-1',
    join_code: 'ABC123',
    logo_url: null,
    address: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: nextId('branch'),
    business_id: 'business-1',
    name: 'Main Branch',
    is_active: true,
    ...overrides,
  };
}

export function createBusinessMember(overrides: Partial<BusinessMember> = {}): BusinessMember {
  return {
    id: nextId('business-member'),
    business_id: 'business-1',
    user_id: 'profile-1',
    role: 'employee',
    branch_id: 'branch-1',
    joined_at: '2026-01-01T00:00:00.000Z',
    is_active: true,
    ...overrides,
  };
}

export function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId('category'),
    business_id: 'business-1',
    name: 'General',
    ...overrides,
  };
}

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: nextId('product'),
    business_id: 'business-1',
    category_id: null,
    name: 'Test Product',
    barcode: '1234567890',
    sku: 'SKU-1',
    selling_price: 100,
    cost_price: 60,
    image_url: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    version: 1,
    is_archived: false,
    description: null,
    ...overrides,
  };
}

export function createInventoryItem(overrides: Partial<InventoryRecord> = {}): InventoryRecord {
  return {
    id: nextId('inventory'),
    product_id: 'product-1',
    branch_id: 'branch-1',
    business_id: 'business-1',
    stock_quantity: 10,
    low_stock_threshold: 5,
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createInventoryLog(overrides: Partial<InventoryLog> = {}): InventoryLog {
  return {
    id: nextId('inventory-log'),
    product_id: 'product-1',
    branch_id: 'branch-1',
    action_type: 'sale',
    quantity_before: 10,
    quantity_changed: -1,
    quantity_after: 9,
    reference_type: 'sale',
    reference_id: 'sale-1',
    performed_by: 'profile-1',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const quantity = overrides.quantity ?? 1;
  const sellingPrice = overrides.selling_price ?? 100;
  return {
    product_id: 'product-1',
    name: 'Test Product',
    barcode: '1234567890',
    sku: 'SKU-1',
    quantity,
    selling_price: sellingPrice,
    subtotal: quantity * sellingPrice,
    image_url: null,
    ...overrides,
  };
}

export function createSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: nextId('sale'),
    business_id: 'business-1',
    branch_id: 'branch-1',
    employee_id: 'profile-1',
    total_amount: 100,
    discount_amount: 0,
    payment_method: 'cash',
    status: 'completed',
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    synced_at: null,
    reference_number: 'TXN-1',
    vat_amount: 10.71,
    idempotency_key: nextId('idem'),
    ...overrides,
  };
}

export function createSaleItem(overrides: Partial<SaleItem> = {}): SaleItem {
  return {
    id: nextId('sale-item'),
    sale_id: 'sale-1',
    product_id: 'product-1',
    quantity: 1,
    unit_price: 100,
    subtotal: 100,
    ...overrides,
  };
}

export function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: nextId('payment'),
    sale_id: 'sale-1',
    business_id: 'business-1',
    method: 'cash',
    amount_peso: 100,
    ...overrides,
  };
}

export function createRefund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: nextId('refund'),
    idempotency_key: nextId('refund-idem'),
    original_sale_id: 'sale-1',
    branch_id: 'branch-1',
    business_id: 'business-1',
    reason: 'Customer return',
    total_peso: 100,
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: 'profile-1',
    source_device_id: 'device-1',
    reference_number: 'REF-1',
    ...overrides,
  };
}

export function createAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: nextId('audit'),
    business_id: 'business-1',
    branch_id: 'branch-1',
    actor_id: 'profile-1',
    event_type: 'sale_created',
    payload: {},
    created_at: '2026-01-01T00:00:00.000Z',
    source_device_id: null,
    ...overrides,
  };
}

export function createSyncStatus(
  overrides: Partial<{
    isOnline: boolean;
    phase: SyncPhase;
    lastError: string | null;
    lastSyncedAt: string | null;
    pendingUploadCount: number;
  }> = {},
) {
  return {
    isOnline: true,
    phase: 'ready' as SyncPhase,
    lastError: null,
    lastSyncedAt: null,
    pendingUploadCount: 0,
    ...overrides,
  };
}

export function createUserRole(role: UserRole = 'employee'): UserRole {
  return role;
}
