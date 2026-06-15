# Testing Suite Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Jest + React Native Testing Library Phase 1 test suite that verifies the repository's current POS behavior without introducing unsupported fallback-table checkout semantics.

**Architecture:** Keep existing `node:test` files intact and add Jest/RNTL for React Native component and app-integration tests. Build shared typed factories and mocks first, then add tests around current cart, auth, sync, query, checkout, and offline PowerSync local-write behavior. Make only small accessibility changes needed for stable component queries.

**Tech Stack:** Expo, React Native, TypeScript, Jest, jest-expo, React Native Testing Library, Zustand, PowerSync mocks, Supabase mocks, Expo module mocks.

---

## File Structure

Create:
- `jest.config.ts`: Jest configuration for Expo/RNTL, alias mapping, coverage, test match.
- `jest.setup.ts`: Central Jest setup, module mocks, global reset helpers.
- `test/__mocks__/powersync.ts`: Typed in-memory mock controls for PowerSync and `@powersync/react-native`.
- `test/__mocks__/supabase.ts`: Typed Supabase client mock controls.
- `test/__mocks__/expoModules.ts`: Secure Store, File System, and Sharing mock state/helpers.
- `test/__mocks__/navigation.ts`: React Navigation mock controls.
- `test/factories/models.ts`: Typed data factories for app models.
- `test/helpers/resetStores.ts`: Store reset helpers for Zustand stores.
- `test/unit/cart.store.test.ts`: Store action tests.
- `test/unit/cart.logic.test.ts`: Derived totals and VAT formula tests.
- `test/unit/auth.store.test.ts`: Auth store/service behavior with mocked Supabase/Secure Store.
- `test/unit/sync.store.test.ts`: Sync store transitions and manual sync guards where feasible.
- `test/unit/product.queries.test.ts`: Product, inventory, and sales query helper tests.
- `test/unit/utils.test.ts`: Validator, formatter, UUID, date utility tests.
- `test/components/SyncStatusBadge.test.tsx`: Sync badge rendering tests.
- `test/components/CartSheet.test.tsx`: Cart sheet behavior tests.
- `test/components/CheckoutScreen.test.tsx`: Checkout screen interaction tests.
- `test/integration/checkout.flow.test.ts`: Current PowerSync local transaction checkout flow tests.
- `test/integration/offline.checkout.flow.test.ts`: Current offline queued primary-table write behavior tests.
- `TEST_PLAN.md`: Project-aligned testing strategy document.

Modify:
- `package.json`: Add Jest test scripts and dev dependencies.
- `package-lock.json`: Updated by `npm install`.
- `src/components/ui/index.tsx`: Add optional accessibility labels to reusable `Badge`, `Button`, `Input`, and `ModalSheet` where useful.
- `src/components/ProductCard.tsx`: Add accessible labels to the card and action button.
- `src/components/SyncStatusBadge.tsx`: Pass stable accessibility labels through to `Badge`.
- `src/features/cart/CartSheet.tsx`: Add stable labels to quantity, remove, discount, and checkout controls.
- `src/features/cart/CheckoutScreen.tsx`: Add stable labels to payment method buttons, payment amount inputs, add/remove payment row controls, reset, and complete sale button.

Do not modify:
- Checkout persistence behavior to write directly to fallback tables.
- Existing `node:test` test files except if a script addition needs to include/exclude Jest explicitly.
- Unrelated dirty file `src/features/auth/LoginScreen.tsx` unless later tests require an explicit accessibility change there.

---

### Task 1: Install Test Dependencies And Configure Scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependencies**

Run:

```powershell
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native @types/jest ts-jest
```

Expected:
- `package.json` gains the dev dependencies.
- `package-lock.json` updates.
- If `@testing-library/jest-native` warns about deprecation or peer issues, keep it only if compatible with the installed RNTL version; otherwise use the matcher setup recommended by RNTL and remove the incompatible package.

- [ ] **Step 2: Add scripts**

Edit `package.json` scripts to include:

```json
{
  "test": "node --test test/*.test.ts",
  "test:jest": "jest",
  "test:jest:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

Keep existing scripts: `start`, `android`, `ios`, `web`, `typecheck`, `lint`.

- [ ] **Step 3: Verify package metadata**

Run:

```powershell
npm test
```

Expected:
- Existing `node:test` suite runs or reaches the same baseline state as before dependency installation.
- If existing Node tests cannot run because TypeScript loading is not configured, do not fix that in this task; record the baseline and continue with Jest setup.

---

### Task 2: Add Jest Configuration

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Create Jest config**

Create `jest.config.ts`:

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@powersync/react-native$': '<rootDir>/test/__mocks__/powersync.ts',
    '^@powersync/react$': '<rootDir>/test/__mocks__/powersync.ts',
    '^@supabase/supabase-js$': '<rootDir>/test/__mocks__/supabase.ts',
    '^expo-secure-store$': '<rootDir>/test/__mocks__/expoModules.ts',
    '^expo-file-system$': '<rootDir>/test/__mocks__/expoModules.ts',
    '^expo-sharing$': '<rootDir>/test/__mocks__/expoModules.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/navigationTypes.ts',
    '!src/types/**',
  ],
  coverageProvider: 'babel',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|@expo/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)',
  ],
};

export default config;
```

- [ ] **Step 2: Create Jest setup**

Create `jest.setup.ts`:

```ts
import '@testing-library/jest-native/extend-expect';
import { cleanup } from '@testing-library/react-native';

import { resetExpoModuleMocks } from './test/__mocks__/expoModules';
import { resetNavigationMocks } from './test/__mocks__/navigation';
import { resetPowerSyncMocks } from './test/__mocks__/powersync';
import { resetSupabaseMocks } from './test/__mocks__/supabase';
import { resetAllStores } from './test/helpers/resetStores';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-navigation/native', () => require('./test/__mocks__/navigation'));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  resetPowerSyncMocks();
  resetSupabaseMocks();
  resetExpoModuleMocks();
  resetNavigationMocks();
  resetAllStores();
});
```

If the installed matcher package does not support `@testing-library/jest-native/extend-expect`, replace that import with the current matcher import supported by the installed RNTL package and document the change in `TEST_PLAN.md`.

- [ ] **Step 3: Verify Jest config loads**

Run:

```powershell
npm run test:jest -- --listTests
```

Expected:
- Jest starts and lists zero or existing Jest-compatible test files.
- It must not crash on config parsing.

---

### Task 3: Build Shared Mocks

**Files:**
- Create: `test/__mocks__/powersync.ts`
- Create: `test/__mocks__/supabase.ts`
- Create: `test/__mocks__/expoModules.ts`
- Create: `test/__mocks__/navigation.ts`

- [ ] **Step 1: Create PowerSync mock**

Create `test/__mocks__/powersync.ts`:

```ts
import React from 'react';

type QueryRow = Record<string, unknown>;

interface CrudTransaction {
  crud: Array<{ table: string; op: unknown; id: string; opData?: Record<string, unknown> | null }>;
  complete: jest.Mock<Promise<void>, []>;
}

interface PowerSyncStatus {
  connected: boolean;
  connecting: boolean;
  hasSynced: boolean;
  lastSyncedAt: Date | null;
  dataFlowStatus: {
    downloading: boolean;
    uploading: boolean;
    downloadError: Error | null;
  };
}

const defaultStatus: PowerSyncStatus = {
  connected: true,
  connecting: false,
  hasSynced: true,
  lastSyncedAt: null,
  dataFlowStatus: {
    downloading: false,
    uploading: false,
    downloadError: null,
  },
};

let queryData: QueryRow[] = [];
let optionalRows = new Map<string, unknown>();
let allRows = new Map<string, unknown[]>();
let nextCrudTransaction: CrudTransaction | null = null;
let uploadQueueCount = 0;
let currentStatus: PowerSyncStatus = { ...defaultStatus, dataFlowStatus: { ...defaultStatus.dataFlowStatus } };

export const executeMock = jest.fn<Promise<void>, [string, unknown[] | undefined]>(() => Promise.resolve());
export const getOptionalMock = jest.fn<Promise<unknown>, [string, unknown[] | undefined]>(async (sql, params) => {
  const key = JSON.stringify([sql, params ?? []]);
  return optionalRows.has(key) ? optionalRows.get(key) : null;
});
export const getAllMock = jest.fn<Promise<unknown[]>, [string, unknown[] | undefined]>(async (sql, params) => {
  const key = JSON.stringify([sql, params ?? []]);
  return allRows.get(key) ?? [];
});
export const writeTransactionMock = jest.fn(<T>(callback: (tx: { execute: typeof executeMock; getOptional: typeof getOptionalMock }) => Promise<T> | T): Promise<T> => {
  return Promise.resolve(callback({ execute: executeMock, getOptional: getOptionalMock }));
});

export const mockPowerSyncDatabase = {
  init: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  connect: jest.fn<Promise<void>, [unknown]>(() => Promise.resolve()),
  disconnect: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  disconnectAndClear: jest.fn<Promise<void>, [unknown]>(() => Promise.resolve()),
  waitForFirstSync: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  waitForStatus: jest.fn<Promise<void>, [unknown]>(() => Promise.resolve()),
  getUploadQueueStats: jest.fn<Promise<{ count: number }>, []>(async () => ({ count: uploadQueueCount })),
  getNextCrudTransaction: jest.fn<Promise<CrudTransaction | null>, []>(async () => nextCrudTransaction),
  execute: executeMock,
  getOptional: getOptionalMock,
  getAll: getAllMock,
  writeTransaction: writeTransactionMock,
  get connected() {
    return currentStatus.connected;
  },
  get connecting() {
    return currentStatus.connecting;
  },
  get currentStatus() {
    return currentStatus;
  },
};

export class PowerSyncDatabase {
  init = mockPowerSyncDatabase.init;
  connect = mockPowerSyncDatabase.connect;
  disconnect = mockPowerSyncDatabase.disconnect;
  disconnectAndClear = mockPowerSyncDatabase.disconnectAndClear;
  waitForFirstSync = mockPowerSyncDatabase.waitForFirstSync;
  waitForStatus = mockPowerSyncDatabase.waitForStatus;
  getUploadQueueStats = mockPowerSyncDatabase.getUploadQueueStats;
  getNextCrudTransaction = mockPowerSyncDatabase.getNextCrudTransaction;
  execute = mockPowerSyncDatabase.execute;
  getOptional = mockPowerSyncDatabase.getOptional;
  getAll = mockPowerSyncDatabase.getAll;
  writeTransaction = mockPowerSyncDatabase.writeTransaction;
  get connected() {
    return mockPowerSyncDatabase.connected;
  }
  get connecting() {
    return mockPowerSyncDatabase.connecting;
  }
  get currentStatus() {
    return mockPowerSyncDatabase.currentStatus;
  }
}

export class Schema {
  constructor(public tables: Record<string, unknown>) {}
}

export class Table {
  constructor(public columns: Record<string, unknown>, public options?: Record<string, unknown>) {}
}

export const column = {
  text: 'text',
  integer: 'integer',
  real: 'real',
};

export const UpdateType = {
  DELETE: 'DELETE',
};

export const PowerSyncContext = React.createContext(mockPowerSyncDatabase);

export function usePowerSync() {
  return mockPowerSyncDatabase;
}

export function useQuery<T>(): { data: T[] } {
  return { data: queryData as T[] };
}

export function setPowerSyncQueryData(rows: QueryRow[]): void {
  queryData = rows;
}

export function setPowerSyncOptionalRow(sql: string, params: unknown[] | undefined, row: unknown): void {
  optionalRows.set(JSON.stringify([sql, params ?? []]), row);
}

export function setPowerSyncAllRows(sql: string, params: unknown[] | undefined, rows: unknown[]): void {
  allRows.set(JSON.stringify([sql, params ?? []]), rows);
}

export function setPowerSyncUploadQueueCount(count: number): void {
  uploadQueueCount = count;
}

export function setPowerSyncStatus(status: Partial<PowerSyncStatus>): void {
  currentStatus = {
    ...currentStatus,
    ...status,
    dataFlowStatus: {
      ...currentStatus.dataFlowStatus,
      ...(status.dataFlowStatus ?? {}),
    },
  };
}

export function setNextCrudTransaction(transaction: CrudTransaction | null): void {
  nextCrudTransaction = transaction;
}

export function createCrudTransaction(crud: CrudTransaction['crud']): CrudTransaction {
  return {
    crud,
    complete: jest.fn<Promise<void>, []>(() => Promise.resolve()),
  };
}

export function resetPowerSyncMocks(): void {
  queryData = [];
  optionalRows = new Map<string, unknown>();
  allRows = new Map<string, unknown[]>();
  nextCrudTransaction = null;
  uploadQueueCount = 0;
  currentStatus = { ...defaultStatus, dataFlowStatus: { ...defaultStatus.dataFlowStatus } };
  jest.clearAllMocks();
}
```

- [ ] **Step 2: Create Supabase mock**

Create `test/__mocks__/supabase.ts`:

```ts
interface SupabaseInvokeResult {
  data: unknown;
  error: { message: string; context?: unknown } | null;
}

const functionResults = new Map<string, SupabaseInvokeResult>();

export const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    setSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
  functions: {
    invoke: jest.fn(async (name: string) => {
      return functionResults.get(name) ?? { data: {}, error: null };
    }),
  },
  from: jest.fn((table: string) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      in: jest.fn(() => Promise.resolve({ data: [], error: null })),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    table,
  })),
};

export function createClient(): typeof mockSupabaseClient {
  return mockSupabaseClient;
}

export function setFunctionResult(functionName: string, result: SupabaseInvokeResult): void {
  functionResults.set(functionName, result);
}

export function resetSupabaseMocks(): void {
  functionResults.clear();
  mockSupabaseClient.auth.signInWithPassword.mockReset();
  mockSupabaseClient.auth.signUp.mockReset();
  mockSupabaseClient.auth.signOut.mockReset().mockResolvedValue({ error: null });
  mockSupabaseClient.auth.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseClient.auth.setSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseClient.functions.invoke.mockClear();
  mockSupabaseClient.from.mockClear();
}

export type SupabaseClient = typeof mockSupabaseClient;
```

- [ ] **Step 3: Create Expo module mocks**

Create `test/__mocks__/expoModules.ts`:

```ts
const secureStore = new Map<string, string>();

export const documentDirectory = 'file:///mock-document-directory/';

export const getItemAsync = jest.fn(async (key: string): Promise<string | null> => secureStore.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string): Promise<void> => {
  secureStore.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  secureStore.delete(key);
});

export const readAsStringAsync = jest.fn(async (): Promise<string> => '');
export const writeAsStringAsync = jest.fn(async (): Promise<void> => undefined);
export const shareAsync = jest.fn(async (): Promise<void> => undefined);

export function setSecureStoreItem(key: string, value: string): void {
  secureStore.set(key, value);
}

export function getSecureStoreSnapshot(): Record<string, string> {
  return Object.fromEntries(secureStore.entries());
}

export function resetExpoModuleMocks(): void {
  secureStore.clear();
  getItemAsync.mockClear();
  setItemAsync.mockClear();
  deleteItemAsync.mockClear();
  readAsStringAsync.mockClear();
  writeAsStringAsync.mockClear();
  shareAsync.mockClear();
}
```

- [ ] **Step 4: Create navigation mock**

Create `test/__mocks__/navigation.ts`:

```ts
export const navigateMock = jest.fn();
export const goBackMock = jest.fn();
export const canGoBackMock = jest.fn(() => false);
export const setOptionsMock = jest.fn();
export const routeParams: Record<string, unknown> = {};

export function useNavigation() {
  return {
    navigate: navigateMock,
    goBack: goBackMock,
    canGoBack: canGoBackMock,
    setOptions: setOptionsMock,
  };
}

export function useRoute() {
  return {
    params: routeParams,
  };
}

export function useFocusEffect(effect: () => void | (() => void)): void {
  const cleanup = effect();
  if (typeof cleanup === 'function') {
    cleanup();
  }
}

export const NavigationContainer = ({ children }: { children: React.ReactNode }) => children;
export const DefaultTheme = {
  colors: {
    primary: '',
    background: '',
    card: '',
    text: '',
    border: '',
    notification: '',
  },
};

export function resetNavigationMocks(): void {
  navigateMock.mockClear();
  goBackMock.mockClear();
  canGoBackMock.mockReset().mockReturnValue(false);
  setOptionsMock.mockClear();
  for (const key of Object.keys(routeParams)) {
    delete routeParams[key];
  }
}
```

- [ ] **Step 5: Run Jest smoke check**

Run:

```powershell
npm run test:jest -- --listTests
```

Expected:
- Jest still loads.

---

### Task 4: Add Factories And Store Reset Helpers

**Files:**
- Create: `test/factories/models.ts`
- Create: `test/helpers/resetStores.ts`

- [ ] **Step 1: Create model factories**

Create `test/factories/models.ts` with typed factories for the Phase 1 suite:

```ts
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
    id: nextId('member'),
    business_id: 'business-1',
    user_id: 'profile-1',
    role: 'employee' as UserRole,
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
    cost_price: 50,
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

export function createSyncStatus(overrides: Partial<{
  isOnline: boolean;
  phase: SyncPhase;
  lastError: string | null;
  lastSyncedAt: string | null;
  pendingUploadCount: number;
}> = {}) {
  return {
    isOnline: true,
    phase: 'ready' as SyncPhase,
    lastError: null,
    lastSyncedAt: null,
    pendingUploadCount: 0,
    ...overrides,
  };
}
```

- [ ] **Step 2: Create store reset helper**

Create `test/helpers/resetStores.ts`:

```ts
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCartStore } from '@/store/cartStore';
import { useSyncStore } from '@/store/syncStore';
import { resetFactorySequence } from '../factories/models';

export function resetAllStores(): void {
  useAuthStore.setState({
    status: 'loading',
    userId: null,
    email: null,
    fullname: null,
    role: null,
    accessToken: null,
    error: null,
  });

  useBusinessStore.setState({
    activeBusiness: null,
    activeBranch: null,
    availableBusinesses: [],
  });

  useCartStore.setState({
    items: [],
    paymentMethod: 'cash',
    discountAmount: 0,
    note: '',
  });

  useSyncStore.setState({
    phase: 'booting',
    isOnline: true,
    remoteSyncConfigured: false,
    lastError: null,
    lastSyncedAt: null,
    pendingUploadCount: 0,
    session: {
      userId: null,
      businessId: null,
      branchId: null,
    },
  });

  resetFactorySequence();
}
```

- [ ] **Step 3: Verify TypeScript understands helpers**

Run:

```powershell
npm run typecheck
```

Expected:
- No new type errors from factories/helpers.

---

### Task 5: Add Accessibility Props For Stable Component Tests

**Files:**
- Modify: `src/components/ui/index.tsx`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/SyncStatusBadge.tsx`
- Modify: `src/features/cart/CartSheet.tsx`
- Modify: `src/features/cart/CheckoutScreen.tsx`

- [ ] **Step 1: Extend shared UI props**

In `src/components/ui/index.tsx`:
- Add `accessibilityLabel?: string` to `BadgeProps`, `ButtonProps`, and `InputProps`.
- Pass `accessibilityLabel` to the badge container, button pressable, and text input.
- Add `accessibilityLabel={title ? `${title} sheet` : 'Modal sheet'}` to the inner `ModalSheet` pressable.

Expected shape:

```tsx
interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'accent';
  accessibilityLabel?: string;
}

export function Badge({ label, tone = 'neutral', accessibilityLabel }: BadgeProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.badge, badgeToneStyles[tone]]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Add ProductCard labels**

In `src/components/ProductCard.tsx`:
- Add `accessibilityRole="button"` and `accessibilityLabel={`${product.name} product card`}` to the outer `Pressable`.
- Add `accessibilityLabel={`Restock ${product.name}`}` to the `onAdd` action button.

- [ ] **Step 3: Add SyncStatusBadge labels**

In `src/components/SyncStatusBadge.tsx`, pass `accessibilityLabel="Sync status"` to each `Badge`.

- [ ] **Step 4: Add CartSheet labels**

In `src/features/cart/CartSheet.tsx`:
- Add labels to decrement/increment buttons: `Decrease ${item.name} quantity`, `Increase ${item.name} quantity`.
- Add `accessibilityLabel={`Remove ${item.name}`}` to the remove button.
- Add `accessibilityLabel="Checkout cart"` to checkout button.
- Add `accessibilityLabel="Discount amount"` or `"Discount percentage"` to discount input.
- Add labels to `Amount`, `Percentage`, `Cancel`, and `Apply` buttons.

- [ ] **Step 5: Add CheckoutScreen labels**

In `src/features/cart/CheckoutScreen.tsx`:
- Add `accessibilityRole="button"` and `accessibilityLabel={`Select ${method} payment for payment ${index + 1}`}` to payment method tiles.
- Add `accessibilityLabel={`Payment ${index + 1} amount`}` to amount input.
- Add labels to add payment line, reset total, remove payment line, and complete sale buttons.

- [ ] **Step 6: Verify app still typechecks**

Run:

```powershell
npm run typecheck
```

Expected:
- No type errors from optional accessibility props.

---

### Task 6: Unit Tests For Cart Store And Cart Logic

**Files:**
- Create: `test/unit/cart.store.test.ts`
- Create: `test/unit/cart.logic.test.ts`

- [ ] **Step 1: Add cart store tests**

Create `test/unit/cart.store.test.ts`:

```ts
import { useCartStore } from '@/store/cartStore';
import { createProduct } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

describe('cartStore', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('adds a new product to an empty cart', () => {
    const product = createProduct({ id: 'product-1', selling_price: 125 });
    useCartStore.getState().addItem(product);
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({
        product_id: 'product-1',
        quantity: 1,
        subtotal: 125,
      }),
    ]);
  });

  it('increments quantity when the same product is added again', () => {
    const product = createProduct({ id: 'product-1', selling_price: 50 });
    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem(product, 2);
    expect(useCartStore.getState().items[0]).toEqual(expect.objectContaining({
      quantity: 3,
      subtotal: 150,
    }));
  });

  it('removes only the selected item', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', name: 'First' }));
    useCartStore.getState().addItem(createProduct({ id: 'product-2', name: 'Second' }));
    useCartStore.getState().removeItem('product-1');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].product_id).toBe('product-2');
  });

  it('updates quantity and subtotal', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 25 }));
    useCartStore.getState().setQuantity('product-1', 4);
    expect(useCartStore.getState().items[0]).toEqual(expect.objectContaining({
      quantity: 4,
      subtotal: 100,
    }));
  });

  it('removes an item when quantity is zero or negative', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1' }));
    useCartStore.getState().setQuantity('product-1', 0);
    expect(useCartStore.getState().items).toEqual([]);

    useCartStore.getState().addItem(createProduct({ id: 'product-2' }));
    useCartStore.getState().setQuantity('product-2', -1);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('clears cart state to initial values', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1' }));
    useCartStore.getState().setPaymentMethod('maya');
    useCartStore.getState().setDiscountAmount(10);
    useCartStore.getState().setNote('Gift wrap');
    useCartStore.getState().clearCart();
    expect(useCartStore.getState()).toEqual(expect.objectContaining({
      items: [],
      paymentMethod: 'cash',
      discountAmount: 0,
      note: '',
    }));
  });

  it('stores payment method, discount, and note', () => {
    useCartStore.getState().setPaymentMethod('gcash');
    useCartStore.getState().setDiscountAmount(-5);
    useCartStore.getState().setNote('Customer note');
    expect(useCartStore.getState().paymentMethod).toBe('gcash');
    expect(useCartStore.getState().discountAmount).toBe(0);
    expect(useCartStore.getState().note).toBe('Customer note');
  });
});
```

- [ ] **Step 2: Add cart logic tests**

Create `test/unit/cart.logic.test.ts`:

```ts
import { renderHook } from '@testing-library/react-native';

import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/store/cartStore';
import { createProduct } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

function inclusiveVat(total: number): number {
  return Math.round((total - total / 1.12) * 100) / 100;
}

describe('cart logic', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it.each([
    [100, 10.71],
    [299.99, 32.14],
    [1500, 160.71],
    [10000, 1071.43],
  ])('computes inclusive VAT for %s', (total, expected) => {
    expect(inclusiveVat(total)).toBe(expected);
  });

  it('computes subtotal and total from cart state', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 2);
    useCartStore.getState().addItem(createProduct({ id: 'product-2', selling_price: 50 }), 3);
    const { result } = renderHook(() => useCart());
    expect(result.current.subtotal).toBe(350);
    expect(result.current.total).toBe(350);
  });

  it('subtracts a fixed discount and floors total at zero', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 1);
    useCartStore.getState().setDiscountAmount(25);
    const discounted = renderHook(() => useCart());
    expect(discounted.result.current.total).toBe(75);

    useCartStore.getState().setDiscountAmount(999);
    const overDiscounted = renderHook(() => useCart());
    expect(overDiscounted.result.current.total).toBe(0);
  });

  it('handles zero, fractional, and large totals', () => {
    expect(inclusiveVat(0)).toBe(0);
    expect(inclusiveVat(0.99)).toBe(0.11);
    expect(inclusiveVat(1_000_000)).toBe(107142.86);
  });
});
```

- [ ] **Step 3: Run cart tests**

Run:

```powershell
npm run test:jest -- test/unit/cart.store.test.ts test/unit/cart.logic.test.ts
```

Expected:
- Both test files pass.

---

### Task 7: Unit Tests For Auth, Sync, Queries, And Utils

**Files:**
- Create: `test/unit/auth.store.test.ts`
- Create: `test/unit/sync.store.test.ts`
- Create: `test/unit/product.queries.test.ts`
- Create: `test/unit/utils.test.ts`

- [ ] **Step 1: Add auth tests**

Create focused tests for:
- `authStore` status transitions via direct store actions.
- `hydrateSession()` with no stored session sets `signed_out`.
- `signOut()` calls mocked Supabase signOut and clears Secure Store.

Use imports:

```ts
import { hydrateSession, signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { getItemAsync, setSecureStoreItem } from '../__mocks__/expoModules';
import { mockSupabaseClient } from '../__mocks__/supabase';
import { resetAllStores } from '../helpers/resetStores';
```

Run:

```powershell
npm run test:jest -- test/unit/auth.store.test.ts
```

Expected:
- Tests pass with mocked Secure Store/Supabase.

- [ ] **Step 2: Add sync tests**

Create tests for:
- initial sync state.
- `setOnline(false)` moves phase to `offline`.
- `setPendingUploadCount(-1)` stores `0`.
- `clearSession()` moves phase to `unauthenticated`.
- `syncPowerSyncNow()` uses upload queue stats and sets `ready` on success.
- duplicate concurrent `syncPowerSyncNow()` calls reuse one in-flight operation.

Run:

```powershell
npm run test:jest -- test/unit/sync.store.test.ts
```

Expected:
- Tests pass and only one mocked PowerSync sync sequence runs for concurrent manual sync calls.

- [ ] **Step 3: Add query helper tests**

Create tests for:
- `buildProductsForBusinessQuery()`
- `getProductsForBusiness()`
- `findProductByBarcode()`
- `findProductById()`
- `buildInventoryForBranchQuery()`
- `buildSaleInventoryLookupQuery()`
- `buildSalesForBusinessQuery()`
- `buildSaleItemsForBusinessQuery()`
- `buildPaymentsForBusinessQuery()`

Run:

```powershell
npm run test:jest -- test/unit/product.queries.test.ts
```

Expected:
- Tests assert SQL fragments and parameters only where helpers return SQL.
- In-memory filters are asserted through returned arrays.

- [ ] **Step 4: Add utility tests**

Create tests for:
- `isValidEmail()`
- `isStrongPassword()`
- `formatCurrency()`
- `formatDate()` exports available in `src/utils/formatDate.ts`
- `generateUUID()`
- `validatePrice()` exports available in `src/utils/validatePrice.ts`

Run:

```powershell
npm run test:jest -- test/unit/utils.test.ts
```

Expected:
- Tests pass against current utility exports.

---

### Task 8: Component Tests For SyncStatusBadge, CartSheet, CheckoutScreen

**Files:**
- Create: `test/components/SyncStatusBadge.test.tsx`
- Create: `test/components/CartSheet.test.tsx`
- Create: `test/components/CheckoutScreen.test.tsx`

- [ ] **Step 1: Add SyncStatusBadge tests**

Test:
- `Syncing`
- `Synced`
- `Offline`
- `Offline: 2 pending`
- failed last error
- degraded last error
- accessible sync status label

Run:

```powershell
npm run test:jest -- test/components/SyncStatusBadge.test.tsx
```

Expected:
- Tests pass using `useSyncStore.setState()`.

- [ ] **Step 2: Add CartSheet tests**

Test:
- empty state when no items.
- item rendering with quantity/subtotal.
- increase/decrease quantity buttons.
- remove item button.
- discount modal fixed amount flow.
- checkout button navigates to `Checkout`.

Run:

```powershell
npm run test:jest -- test/components/CartSheet.test.tsx
```

Expected:
- Tests pass using navigation mock and actual cart store.

- [ ] **Step 3: Add CheckoutScreen tests**

Test:
- renders cart item summary and totals.
- adds/removes split payment row.
- changing a payment method updates the row.
- incomplete payment press shows `Payment incomplete` alert.
- successful checkout calls `checkout()` path and navigates to `Receipt`.
- footer text matches current offline-oriented copy.

Run:

```powershell
npm run test:jest -- test/components/CheckoutScreen.test.tsx
```

Expected:
- Tests pass with mocked local DB transaction or hook dependencies.

---

### Task 9: Integration Tests For Checkout And Offline Queue Semantics

**Files:**
- Create: `test/integration/checkout.flow.test.ts`
- Create: `test/integration/offline.checkout.flow.test.ts`

- [ ] **Step 1: Add checkout flow test**

Test the current local transaction behavior by setting:
- signed-in user in `authStore`.
- active business/branch in `businessStore`.
- product and inventory rows in PowerSync mocks.
- cart items in `cartStore`.

Assert:
- sale write path inserts `sales`, `sale_items`, `payments`, `inventory_logs`, `audit_logs`.
- sale has `idempotency_key`.
- VAT amount uses 12% inclusive formula.
- split payments become two payment rows.
- thrown write failure rejects checkout and does not clear cart.

Run:

```powershell
npm run test:jest -- test/integration/checkout.flow.test.ts
```

Expected:
- Tests pass with current primary-table transaction behavior.

- [ ] **Step 2: Add offline checkout queue semantics test**

Test:
- set PowerSync mock status to disconnected before checkout.
- checkout still writes to primary tables.
- no assertions expect direct `fallback_*` inserts.
- set upload queue count to `1` and sync phase to `offline`.
- `SyncStatusBadge` shows `Offline: 1 pending`.
- create CRUD transaction rows and call `SupabasePowerSyncConnector.uploadData()`.
- assert `commit_sale` is invoked with sale, sale items, payments, inventory items/logs, and audit logs.
- assert transaction `complete()` is called.

Run:

```powershell
npm run test:jest -- test/integration/offline.checkout.flow.test.ts
```

Expected:
- Tests pass and document current behavior explicitly.

---

### Task 10: Write TEST_PLAN.md

**Files:**
- Create: `TEST_PLAN.md`

- [ ] **Step 1: Create test plan**

Create `TEST_PLAN.md` with:
- Objectives.
- Scope and out of scope.
- Test layers.
- Risk matrix.
- Coverage targets.
- Mock strategy.
- Offline testing strategy.
- CI readiness.
- Future work.
- Naming conventions.

Include this exact current-behavior statement:

```markdown
Offline checkout currently writes through PowerSync local primary-table transactions. Tests must not assert direct checkout writes to `fallback_sales`, `fallback_sale_items`, `fallback_payments`, or `fallback_inventory_items` unless the app implementation changes.
```

- [ ] **Step 2: Run final verification**

Run:

```powershell
npm run test:jest
npm run typecheck
npm run lint
```

Expected:
- Jest suite passes.
- Typecheck passes or reports pre-existing unrelated errors separately.
- Lint passes or reports pre-existing unrelated errors separately.

---

## Self-Review

Spec coverage:
- Covers Phase 1 setup, mocks, factories, store tests, component tests, integration tests, and `TEST_PLAN.md`.
- Explicitly aligns offline checkout tests with current primary-table PowerSync behavior.
- Defers unimplemented hardware, Supabase Storage, real device transitions, full employee/business integration suites, and fallback-table checkout writes.

Placeholder scan:
- No task contains `TBD`, `TODO`, or an instruction to "fill in" behavior later.
- Deferred work is explicitly listed as later-phase scope, not a missing Phase 1 task.

Type consistency:
- Uses current `authStore.status` values: `loading`, `signed_out`, `signed_in`.
- Uses current `syncStore.phase` values including `unauthenticated`.
- Uses current model field names from `src/types/models.ts`.
- Uses current checkout behavior: PowerSync local primary-table write path and upload queue bundling.
