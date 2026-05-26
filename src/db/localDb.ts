import { generateUUID } from '@/utils/generateUUID';
import type {
  AuditLog,
  Branch,
  Business,
  BusinessMember,
  BusinessSummary,
  Category,
  InventoryLog,
  InventoryRecord,
  PaymentMethod,
  Profile,
  Product,
  Sale,
  SaleItem,
  SaleStatus,
  UserRole,
} from '@/types/models';

export interface LocalDbState {
  profiles: Profile[];
  businesses: Business[];
  businessMembers: BusinessMember[];
  branches: Branch[];
  categories: Category[];
  products: Product[];
  inventory: InventoryRecord[];
  sales: Sale[];
  saleItems: SaleItem[];
  inventoryLogs: InventoryLog[];
  auditLogs: AuditLog[];
}

type Listener = () => void;

const now = () => new Date().toISOString();

const ownerId = '11111111-1111-4111-8111-111111111111';
const employeeId = '22222222-2222-4222-8222-222222222222';
const businessId = '33333333-3333-4333-8333-333333333333';
const branchId = '44444444-4444-4444-8444-444444444444';
const branchId2 = '55555555-5555-4555-8555-555555555555';
const categoryBeverages = '66666666-6666-4666-8666-666666666666';
const categorySnacks = '77777777-7777-4777-8777-777777777777';
const saleId = '88888888-8888-4888-8888-888888888888';
const saleItemId = '99999999-9999-4999-8999-999999999999';

function createInitialState(): LocalDbState {
  const createdAt = '2026-05-20T08:00:00.000Z';
  return {
    profiles: [
      {
        id: ownerId,
        fullname: 'Ava Reyes',
        email: 'owner@thevault.local',
        avatar_url: null,
        created_at: createdAt,
      },
      {
        id: employeeId,
        fullname: 'Ben Cruz',
        email: 'cashier@thevault.local',
        avatar_url: null,
        created_at: createdAt,
      },
    ],
    businesses: [
      {
        id: businessId,
        name: 'Northwind Market',
        owner_id: ownerId,
        join_code: 'A3X9KL',
        logo_url: null,
        address: 'Makati City',
        is_active: true,
        created_at: createdAt,
      },
    ],
    businessMembers: [
      {
        id: generateUUID(),
        business_id: businessId,
        user_id: ownerId,
        role: 'owner',
        branch_id: branchId,
        joined_at: createdAt,
      },
      {
        id: generateUUID(),
        business_id: businessId,
        user_id: employeeId,
        role: 'employee',
        branch_id: branchId,
        joined_at: createdAt,
      },
    ],
    branches: [
      {
        id: branchId,
        business_id: businessId,
        name: 'Main Branch',
        is_active: true,
      },
      {
        id: branchId2,
        business_id: businessId,
        name: 'Warehouse',
        is_active: true,
      },
    ],
    categories: [
      {
        id: categoryBeverages,
        business_id: businessId,
        name: 'Beverages',
      },
      {
        id: categorySnacks,
        business_id: businessId,
        name: 'Snacks',
      },
    ],
    products: [
      {
        id: generateUUID(),
        business_id: businessId,
        category_id: categoryBeverages,
        name: 'Cold Brew Coffee',
        barcode: '1002003004005',
        sku: 'CB-001',
        selling_price: 145,
        cost_price: 90,
        image_url: null,
        is_active: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
      {
        id: generateUUID(),
        business_id: businessId,
        category_id: categorySnacks,
        name: 'Sea Salt Chips',
        barcode: '1002003004006',
        sku: 'SS-101',
        selling_price: 65,
        cost_price: 38,
        image_url: null,
        is_active: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
      {
        id: generateUUID(),
        business_id: businessId,
        category_id: categorySnacks,
        name: 'Archived Energy Bar',
        barcode: '1002003004007',
        sku: 'EB-404',
        selling_price: 55,
        cost_price: 30,
        image_url: null,
        is_active: false,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
    inventory: [
      {
        id: generateUUID(),
        product_id: '00000000-0000-4000-8000-000000000001',
        branch_id: branchId,
        stock_quantity: 48,
        low_stock_threshold: 10,
        updated_at: createdAt,
      },
      {
        id: generateUUID(),
        product_id: '00000000-0000-4000-8000-000000000002',
        branch_id: branchId,
        stock_quantity: 23,
        low_stock_threshold: 10,
        updated_at: createdAt,
      },
      {
        id: generateUUID(),
        product_id: '00000000-0000-4000-8000-000000000003',
        branch_id: branchId,
        stock_quantity: 0,
        low_stock_threshold: 10,
        updated_at: createdAt,
      },
    ],
    sales: [
      {
        id: saleId,
        business_id: businessId,
        branch_id: branchId,
        employee_id: employeeId,
        total_amount: 210,
        discount_amount: 0,
        payment_method: 'cash',
        status: 'completed',
        notes: null,
        created_at: '2026-05-22T02:15:00.000Z',
        synced_at: '2026-05-22T02:16:00.000Z',
      },
    ],
    saleItems: [
      {
        id: saleItemId,
        sale_id: saleId,
        product_id: '00000000-0000-4000-8000-000000000001',
        quantity: 1,
        unit_price: 145,
        subtotal: 145,
      },
      {
        id: generateUUID(),
        sale_id: saleId,
        product_id: '00000000-0000-4000-8000-000000000002',
        quantity: 1,
        unit_price: 65,
        subtotal: 65,
      },
    ],
    inventoryLogs: [],
    auditLogs: [],
  };
}

let state = createInitialState();
let version = 0;
const listeners = new Set<Listener>();

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

function touch(): void {
  emit();
}

function lookupProductId(index: number): string {
  return state.products[index]?.id ?? generateUUID();
}

state.inventory = [
  {
    id: generateUUID(),
    product_id: lookupProductId(0),
    branch_id: branchId,
    stock_quantity: 48,
    low_stock_threshold: 10,
    updated_at: now(),
  },
  {
    id: generateUUID(),
    product_id: lookupProductId(1),
    branch_id: branchId,
    stock_quantity: 23,
    low_stock_threshold: 10,
    updated_at: now(),
  },
  {
    id: generateUUID(),
    product_id: lookupProductId(2),
    branch_id: branchId,
    stock_quantity: 0,
    low_stock_threshold: 10,
    updated_at: now(),
  },
];

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVersion(): number {
  return version;
}

export function getLocalDbState(): LocalDbState {
  return state;
}

export function resetLocalDb(): void {
  state = createInitialState();
  state.inventory = [
    {
      id: generateUUID(),
      product_id: state.products[0].id,
      branch_id: branchId,
      stock_quantity: 48,
      low_stock_threshold: 10,
      updated_at: now(),
    },
    {
      id: generateUUID(),
      product_id: state.products[1].id,
      branch_id: branchId,
      stock_quantity: 23,
      low_stock_threshold: 10,
      updated_at: now(),
    },
    {
      id: generateUUID(),
      product_id: state.products[2].id,
      branch_id: branchId,
      stock_quantity: 0,
      low_stock_threshold: 10,
      updated_at: now(),
    },
  ];
  version = 0;
  emit();
}

export function getBusinessSummariesForUser(userId: string): BusinessSummary[] {
  const memberships = state.businessMembers.filter((entry) => entry.user_id === userId);
  return memberships.map((membership) => {
    const business = state.businesses.find((entry) => entry.id === membership.business_id)!;
    const branch =
      membership.branch_id !== null
        ? state.branches.find((entry) => entry.id === membership.branch_id) ?? null
        : null;

    return {
      businessId: business.id,
      businessName: business.name,
      role: membership.role,
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? null,
    };
  });
}

export function findProfileByEmail(email: string): Profile | null {
  return state.profiles.find((entry) => entry.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function findProfileById(userId: string): Profile | null {
  return state.profiles.find((entry) => entry.id === userId) ?? null;
}

export function findBusinessByJoinCode(joinCode: string): Business | null {
  return (
    state.businesses.find((entry) => entry.join_code.toUpperCase() === joinCode.toUpperCase()) ?? null
  );
}

export function findBusinessById(businessId: string): Business | null {
  return state.businesses.find((entry) => entry.id === businessId) ?? null;
}

export function findBranchById(branchIdValue: string): Branch | null {
  return state.branches.find((entry) => entry.id === branchIdValue) ?? null;
}

export function addAuditLog(log: AuditLog): void {
  state.auditLogs.unshift(log);
  touch();
}

export function createBusiness(input: {
  name: string;
  ownerId: string;
  address?: string | null;
  branchName?: string;
}): Business {
  const business: Business = {
    id: generateUUID(),
    name: input.name,
    owner_id: input.ownerId,
    join_code: generateJoinCode(),
    logo_url: null,
    address: input.address ?? null,
    is_active: true,
    created_at: now(),
  };
  state.businesses.unshift(business);

  const branch: Branch = {
    id: generateUUID(),
    business_id: business.id,
    name: input.branchName ?? 'Main Branch',
    is_active: true,
  };
  state.branches.unshift(branch);

  state.businessMembers.unshift({
    id: generateUUID(),
    business_id: business.id,
    user_id: input.ownerId,
    role: 'owner',
    branch_id: branch.id,
    joined_at: now(),
  });

  addAuditLog({
    id: generateUUID(),
    business_id: business.id,
    event_type: 'business_created',
    actor_id: input.ownerId,
    payload: {
      business_name: business.name,
      branch_name: branch.name,
      join_code: business.join_code,
    },
    created_at: now(),
  });
  touch();
  return business;
}

export function addBusinessMember(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  branchId?: string | null;
}): BusinessMember {
  const member: BusinessMember = {
    id: generateUUID(),
    business_id: input.businessId,
    user_id: input.userId,
    role: input.role,
    branch_id: input.branchId ?? null,
    joined_at: now(),
  };
  state.businessMembers.unshift(member);
  touch();
  return member;
}

export function upsertProfile(profile: Profile): void {
  const existingIndex = state.profiles.findIndex((entry) => entry.id === profile.id);
  if (existingIndex >= 0) {
    state.profiles[existingIndex] = profile;
  } else {
    state.profiles.unshift(profile);
  }
  touch();
}

export function upsertProduct(product: Product, actorId: string): Product {
  const existingIndex = state.products.findIndex((entry) => entry.id === product.id);
  const payload = { before: existingIndex >= 0 ? state.products[existingIndex] : null, after: product };
  if (existingIndex >= 0) {
    state.products[existingIndex] = { ...product, updated_at: now() };
  } else {
    state.products.unshift({ ...product, created_at: product.created_at ?? now(), updated_at: now() });
  }

  addAuditLog({
    id: generateUUID(),
    business_id: product.business_id,
    event_type: 'product_edit',
    actor_id: actorId,
    payload,
    created_at: now(),
  });
  touch();
  return product;
}

export function archiveProduct(productId: string, actorId: string): void {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) {
    return;
  }

  product.is_active = false;
  product.updated_at = now();

  addAuditLog({
    id: generateUUID(),
    business_id: product.business_id,
    event_type: 'product_archived',
    actor_id: actorId,
    payload: { productId },
    created_at: now(),
  });
  touch();
}

export function restockInventory(input: {
  productId: string;
  branchId: string;
  quantity: number;
  actorId: string;
  referenceId?: string | null;
}): InventoryLog {
  const inventory = ensureInventoryRow(input.productId, input.branchId);
  const quantityBefore = inventory.stock_quantity;
  inventory.stock_quantity += input.quantity;
  inventory.updated_at = now();

  const log: InventoryLog = {
    id: generateUUID(),
    product_id: input.productId,
    branch_id: input.branchId,
    action_type: 'restock',
    quantity_before: quantityBefore,
    quantity_changed: input.quantity,
    quantity_after: inventory.stock_quantity,
    reference_type: 'manual',
    reference_id: input.referenceId ?? null,
    performed_by: input.actorId,
    created_at: now(),
  };
  state.inventoryLogs.unshift(log);
  addAuditLog({
    id: generateUUID(),
    business_id: state.products.find((entry) => entry.id === input.productId)?.business_id ?? '',
    event_type: 'restock',
    actor_id: input.actorId,
    payload: {
      productId: input.productId,
      branchId: input.branchId,
      quantity: input.quantity,
    },
    created_at: now(),
  });
  touch();
  return log;
}

export function initializeInventory(input: {
  productId: string;
  branchId: string;
  quantity: number;
  actorId: string;
}): InventoryLog {
  const inventory = ensureInventoryRow(input.productId, input.branchId);
  const quantityBefore = inventory.stock_quantity;
  inventory.stock_quantity = input.quantity;
  inventory.updated_at = now();

  const log: InventoryLog = {
    id: generateUUID(),
    product_id: input.productId,
    branch_id: input.branchId,
    action_type: 'initial',
    quantity_before: quantityBefore,
    quantity_changed: input.quantity - quantityBefore,
    quantity_after: inventory.stock_quantity,
    reference_type: 'system',
    reference_id: null,
    performed_by: input.actorId,
    created_at: now(),
  };
  state.inventoryLogs.unshift(log);
  touch();
  return log;
}

export function createSale(input: {
  sale: Sale;
  items: SaleItem[];
  actorId: string;
}): Sale {
  const sale = { ...input.sale, synced_at: null };
  state.sales.unshift(sale);
  state.saleItems.unshift(...input.items);

  for (const item of input.items) {
    const product = state.products.find((entry) => entry.id === item.product_id);
    if (!product) {
      continue;
    }
    const inventory = ensureInventoryRow(item.product_id, sale.branch_id);
    const before = inventory.stock_quantity;
    inventory.stock_quantity -= item.quantity;
    inventory.updated_at = now();
    state.inventoryLogs.unshift({
      id: generateUUID(),
      product_id: item.product_id,
      branch_id: sale.branch_id,
      action_type: 'sale',
      quantity_before: before,
      quantity_changed: -item.quantity,
      quantity_after: inventory.stock_quantity,
      reference_type: 'sale',
      reference_id: sale.id,
      performed_by: input.actorId,
      created_at: now(),
    });
  }

  addAuditLog({
    id: generateUUID(),
    business_id: sale.business_id,
    event_type: 'sale_created',
    actor_id: input.actorId,
    payload: {
      saleId: sale.id,
      totalAmount: sale.total_amount,
      paymentMethod: sale.payment_method,
    },
    created_at: now(),
  });
  touch();
  return sale;
}

export function markSaleSynced(saleIdValue: string): void {
  const sale = state.sales.find((entry) => entry.id === saleIdValue);
  if (!sale) {
    return;
  }
  sale.synced_at = now();
  touch();
}

export function updateSaleStatus(saleIdValue: string, status: SaleStatus): void {
  const sale = state.sales.find((entry) => entry.id === saleIdValue);
  if (!sale) {
    return;
  }
  sale.status = status;
  sale.synced_at = null;
  touch();
}

export function getUnsyncedSalesCount(): number {
  return state.sales.filter((sale) => sale.synced_at === null).length;
}

export function generateJoinCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let joinCode = '';
  for (let index = 0; index < 6; index += 1) {
    joinCode += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return joinCode;
}

function ensureInventoryRow(productId: string, branchIdValue: string): InventoryRecord {
  const existing = state.inventory.find(
    (entry) => entry.product_id === productId && entry.branch_id === branchIdValue,
  );
  if (existing) {
    return existing;
  }

  const inventory: InventoryRecord = {
    id: generateUUID(),
    product_id: productId,
    branch_id: branchIdValue,
    stock_quantity: 0,
    low_stock_threshold: 10,
    updated_at: now(),
  };
  state.inventory.unshift(inventory);
  return inventory;
}
