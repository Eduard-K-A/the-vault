# AI Testing Prompt — Offline-First POS System
### React Native · PowerSync · Supabase · Expo · TypeScript

---

## MASTER PROMPT

You are a senior software engineer and test architect specializing in React Native, TypeScript, Expo, PowerSync offline-first sync, and Supabase. You will generate a **project-aligned, production-grade automated testing suite** for the current offline-first mobile Point of Sale (POS) application.

This prompt is the implementation source of truth. Tests must verify the behavior that exists in the repository today. Do not introduce new product behavior only to satisfy an aspirational test case. When a future scenario is useful but not implemented yet, document it in `TEST_PLAN.md` under Future Work instead of generating a failing test.

---

## TECH STACK

- **Framework**: React Native + Expo (single Expo project, not monorepo)
- **Language**: TypeScript with `strict: true`, path alias `@/* -> src/*`
- **Navigation**: React Navigation (native stack + tab navigators)
- **State Management**: Zustand (`authStore`, `businessStore`, `cartStore`, `syncStore`)
- **Offline Sync**: `@powersync/react-native` v1.35.3 — singleton initialized in `src/powersync/system.ts`, provided via `PowerSyncContext.Provider`
- **Backend**: Supabase (Auth, Database, Edge Functions) — singleton client in `src/services/supabaseClient.ts`
- **Session Persistence**: `expo-secure-store` (key: `supabase_session_v1`)
- **Local DB**: `@journeyapps/react-native-quick-sqlite`
- **Test Framework (to introduce)**: **Jest + React Native Testing Library (RNTL)** for component/integration tests; **Node built-in `node:test`** for pure logic tests already in `test/*.test.ts`
- **Node**: v22.18.0 — Package manager: npm
- **Coverage Target**: Phase 1 should establish meaningful coverage for checkout, sync status, cart, auth basics, inventory/query helpers, and critical utilities. Long-term target is 80% overall and 90%+ for checkout, sync, and inventory mutation paths.

---

## PROJECT STRUCTURE (for import path accuracy)

```
src/
  app/           — navigation entry and route composition
  components/    — shared UI: Screen, Card, Badge, Button, Input, ModalSheet,
                   SectionHeader, StatCard, ProductCard, SearchBar,
                   SyncStatusBadge, EmptyState, BarChart, DonutChart, CartSheet
  config/        — runtime configuration helpers
  constants/     — colors, dimensions, typography
  db/            — PowerSync transaction wrapper, query helpers, cleanup/snapshot helpers
  features/      — screens by domain: auth, business, cart, employees, inventory, sales, settings
  hooks/         — useCart, useProducts, useSales, useAnalytics, useSyncStatus
  powersync/     — schema, connector, system, upload helpers
  services/      — auth, business, sync, offline, supabaseClient, export, remote API services
  store/         — Zustand: authStore, businessStore, cartStore, syncStore
  types/         — shared TypeScript models and navigation types
  utils/         — formatting, validation, UUID, sync debug utilities
supabase/
  functions/     — Edge Functions: add-member, apply_inventory_adjustment,
                   business-summaries, commit_sale, create-branch, create-business,
                   create_refund, delete-branch, delete-business, save_product,
                   upsert-profile, validate-join-code, write_audit_log
  migrations/    — RLS policies and DB migrations
test/            — existing Node test files (*.test.ts using node:test)
```

---

## POWERSYNC SCHEMA (synced tables + current local-only support tables)

**Synced tables**: `profiles`, `businesses`, `branches`, `business_members`, `categories`, `products`, `inventory_items`, `inventory_logs`, `sales`, `sale_items`, `payments`, `refunds`, `refund_items`, `audit_logs`, `device_sessions`

**Local-only (fallback) tables**: `fallback_branches`, `fallback_products`, `fallback_inventory_items`, `fallback_sales`, `fallback_sale_items`, `fallback_payments`

Current behavior note:
- Checkout and inventory mutation code writes through PowerSync local transactions against the primary PowerSync tables (`sales`, `sale_items`, `payments`, `inventory_items`, `inventory_logs`, `audit_logs`).
- PowerSync queues those local primary-table writes for upload.
- Fallback tables are current support tables used by query/snapshot merge paths. Do not test offline checkout as if it writes directly to `fallback_sales`, `fallback_sale_items`, `fallback_payments`, or `fallback_inventory_items` unless the app code is changed first.
- Fallback-specific tests should focus on existing query helpers that union primary and fallback rows and avoid duplicates when a primary row exists.

Key column notes:
- `sales`: includes `idempotency_key`, `vat_amount`, `reference_number`, `synced_at`
- `products`: includes `version`, `is_archived`, `is_active`, `barcode`, `sku`
- `inventory_items`: includes `low_stock_threshold`
- `refunds`: includes `idempotency_key`, `source_device_id`, `reference_number`

---

## USER ROLES & AUTH FLOW

- **Roles**: `owner`, `employee`
- **Auth**: Email/password via Supabase `signInWithPassword()` / `signUp()`
- **Session**: Serialized to Expo Secure Store on login; restored via `hydrateSession()` on app launch
- **Role routing**: Owners → owner tabs (Inventory, Sales, Employees, Settings); Employees → employee tabs (Inventory, Sales, Settings)
- **RLS**: All data is business-scoped. `can_access_business()` enforces owner or active member access.

---

## CORE BUSINESS LOGIC (reference for test accuracy)

### Cart Logic (`cartStore`)
- `addItem()`: adds new item or increments quantity on duplicate product ID
- `setQuantity(id, qty)`: updates quantity; removes item if `qty <= 0`
- `removeItem(id)`: deletes item from cart
- `clearCart()`: resets items, payment method, discount, and note
- `subtotal` = sum of (unit_price × quantity) per item
- `total` = `Math.max(0, subtotal - discountAmount)`
- Discount can be fixed peso amount or percentage (percent converted to fixed amount before storing)

### Tax / VAT
- `vat_amount = total_amount - (total_amount / 1.12)`, rounded to 2 decimal places (12% VAT-inclusive)

### Checkout Flow
- Validates: non-empty cart, active business, active branch, authenticated user
- Split payments: multiple payment lines (method + amount); sum of received payments must `>= total`
- Writes atomically inside a PowerSync transaction: `sales`, `sale_items`, `payments`, inventory decrements in `inventory_items`, `inventory_logs`, `audit_logs`
- Offline/current PowerSync behavior: the same local primary-table transaction succeeds while offline → PowerSync queues the local CRUD transaction → `uploadData()` bundles rows → calls `commit_sale` Edge Function with idempotency key when credentials/client connectivity are available.

### Sync States (`syncStore`)
- Phases: `booting`, `unauthenticated`, `syncing`, `ready`, `offline`, `degraded`, `failed`
- Tracks: `pendingUploadCount`, `lastError`, `lastSyncedAt`
- Race guards: `manualSyncPromise`, `connectStreamPromise` prevent duplicate in-flight sync ops
- Snapshot import marker prevents re-uploading imported rows

### Auth Store States (`authStore`)
- Auth status values are `loading`, `signed_out`, and `signed_in`.
- Tests must use these exact values. Do not use `unauthenticated` for `authStore`; that value belongs to `syncStore.phase`.

### Inventory
- `inventory_items.stock_quantity` decremented on sale
- Cannot go negative — validate before checkout
- Restock via `apply_inventory_adjustment` Edge Function
- Low stock tracked via `low_stock_threshold`

---

## MOCK IMPLEMENTATIONS TO GENERATE

Generate reusable, typed mock modules for the following. Place them in `test/__mocks__/` or `src/__mocks__/` as appropriate:

1. **`@powersync/react-native`** — mock `usePowerSync()`, `useQuery()`, `PowerSyncContext`, `execute()`, `getOptional()`, `getUploadQueueStats()`, `waitForFirstSync()`, `waitForStatus()`, `connect()`, `disconnect()`
2. **`@supabase/supabase-js`** — mock `supabase.auth.signInWithPassword()`, `signUp()`, `signOut()`, `getSession()`, `setSession()`; mock `supabase.functions.invoke()` per Edge Function name
3. **`expo-secure-store`** — mock `getItemAsync()`, `setItemAsync()`, `deleteItemAsync()`
4. **`expo-file-system`** — mock `readAsStringAsync()`, `writeAsStringAsync()`, `documentDirectory`
5. **`expo-sharing`** — mock `shareAsync()`
6. **`@react-navigation/native`** — mock `useNavigation()`, `useRoute()`, `useFocusEffect()`
7. **Zustand stores** — provide factory helpers to initialize `authStore`, `cartStore`, `businessStore`, `syncStore` with known test states

---

## TEST DATA FACTORIES TO GENERATE

Generate a `test/factories/` directory with TypeScript factory functions with sensible defaults and override support. Include factories for:

- `createProfile(overrides?)` — role: `owner` | `employee`
- `createBusiness(overrides?)`
- `createBranch(overrides?)`
- `createBusinessMember(overrides?)` — with role
- `createCategory(overrides?)`
- `createProduct(overrides?)` — including `barcode`, `sku`, `version`, `is_active`, `is_archived`
- `createInventoryItem(overrides?)` — including `low_stock_threshold`
- `createInventoryLog(overrides?)`
- `createCartItem(overrides?)` — including `subtotal`
- `createSale(overrides?)` — including `idempotency_key`, `vat_amount`, `reference_number`
- `createSaleItem(overrides?)`
- `createPayment(overrides?)` — methods: `cash` | `gcash` | `maya` | `card`
- `createRefund(overrides?)` — including `idempotency_key`, `source_device_id`
- `createAuditLog(overrides?)`
- `createSyncStatus(overrides?)` — with all phase variants

---

## TEST FILES TO GENERATE

Generate **one focused test suite file per module**. Use `*.test.ts` for pure logic and `*.test.tsx` for components. All files must use TypeScript with full type annotations. Follow Jest conventions (`describe`, `it`/`test`, `expect`, `beforeEach`, `afterEach`). Use RNTL (`@testing-library/react-native`) for component tests.

---

### MODULE 1: `test/unit/cart.store.test.ts`
Test `cartStore` (Zustand) in isolation. Keep this module focused on stored state and store actions; derived totals belong in `useCart`/cart logic tests.

- `addItem()` adds a new product to an empty cart
- `addItem()` increments quantity when same product ID is added again
- `removeItem()` removes the correct item without affecting others
- `setQuantity()` updates quantity correctly
- `setQuantity()` removes item when quantity is set to 0
- `setQuantity()` removes item when quantity is set to a negative number
- `clearCart()` resets all cart state to initial values
- `setPaymentMethod()` stores the selected payment method
- `setDiscountAmount()` stores a non-negative fixed discount amount
- `setDiscountAmount()` floors negative discounts to 0
- `setNote()` stores the cart note
- `discountAmount` persists correctly after `addItem()` is called again

---

### MODULE 2: `test/unit/cart.logic.test.ts`
Test derived cart calculations through current exported code paths. Prefer `useCart` with mocked stores when testing hook-level totals; use small local test helpers only when no exported pure helper exists yet.

- `vat_amount` for a given total is computed as `total - (total / 1.12)` rounded to 2 decimal places
- VAT is correct for common POS amounts (100, 299.99, 1500, 10000)
- `subtotal` calculation from an array of cart items matches expected sum
- `total` equals `subtotal` when no discount is applied
- `total` equals `subtotal - discountAmount` when a fixed discount is set
- `total` is never negative (floored at 0) when discount exceeds subtotal
- Percentage discount conversion is covered in `CartSheet` component tests because current conversion happens in the discount UI, not in `cartStore`
- Price edge cases: zero-price items, fractional pesos, large totals

---

### MODULE 3: `test/unit/auth.store.test.ts`
Test `authStore` and `authService` logic.

- `hydrateSession()` calls `expo-secure-store` and restores session into Supabase client
- `hydrateSession()` clears persisted session and signs out when stored token is invalid
- `signIn()` calls Supabase `signInWithPassword()` and updates store with user + profile
- `signIn()` throws and does not update store on Supabase auth error
- `signOut()` calls Supabase `signOut()`, clears secure store, resets auth state
- Session is serialized to secure store after successful sign-in
- Auth state is `loading` before hydration and `signed_out` after hydration finds no session
- Role is correctly set to `owner` or `employee` from profile data

---

### MODULE 4: `test/unit/sync.store.test.ts`
Test `syncStore` state transitions and guards.

- Initial state is `booting`
- Phase transitions correctly: `booting → syncing → ready`
- Phase transitions correctly: `syncing → offline` when connection is lost
- Phase transitions correctly: `syncing → failed` when sync throws an error
- `lastError` is set when phase becomes `failed` or `degraded`
- `lastError` is cleared by flows that explicitly clear it, such as `initialize()`, `setSession()`, and successful manual sync
- `pendingUploadCount` updates when `getUploadQueueStats()` returns a count
- `manualSyncPromise` guard prevents duplicate concurrent manual sync calls
- `connectStreamPromise` guard prevents duplicate connect stream calls
- Missing remote config sets `lastError` to a descriptive message while local state remains available

---

### MODULE 5: `test/unit/checkout.logic.test.ts`
Test checkout validation and sale construction logic.

- Checkout throws/returns error when cart is empty
- Checkout throws/returns error when no active business is set
- Checkout throws/returns error when no active branch is set
- Checkout throws/returns error when user is not authenticated
- Checkout throws/returns error when inventory would go negative for any item
- Split payment validation: passes when sum of payment amounts equals total
- Split payment validation: passes when sum of payment amounts exceeds total (overpayment allowed)
- Split payment validation: fails when sum of payment amounts is less than total
- Sale object is correctly constructed from cart state (amounts, VAT, reference number, idempotency key)
- `sale_items` array correctly maps from cart items
- `payments` array correctly maps from split payment lines
- Inventory decrement is correctly calculated per item

---

### MODULE 6: `test/unit/inventory.logic.test.ts`
Test inventory mutation helpers and validation.

- `stock_quantity` cannot be decremented below 0 — validation returns an error
- Decrement of stock by sale quantity is correctly computed
- Low stock flag is correctly identified when `stock_quantity <= low_stock_threshold`
- Restock quantity normalization: negative or zero restock values are rejected
- `apply_inventory_adjustment` Edge Function is called with correct payload on restock
- Inventory log entry is correctly constructed for a sale decrement event
- Inventory log entry is correctly constructed for a restock event
- Archived products (`is_archived: true`) are excluded from active product queries
- Inactive products (`is_active: false`) are excluded from active product queries

---

### MODULE 7: `test/unit/offline.service.test.ts`
Test offline runtime service, current PowerSync local-write behavior, and fallback query support.

- Missing remote sync config sets `lastError` to "Remote sync is not configured yet. Local offline state remains available."
- `bindOfflineSession(null)` clears the sync session and moves sync phase to `unauthenticated`
- `bindOfflineSession(session)` sets the sync session and moves sync phase to `ready`
- `getOfflineConfigSummary()` reports app env, remote sync configuration state, and PowerSync schema
- Current offline checkout behavior writes through the same PowerSync local transaction path as online checkout; do not assert direct writes to fallback sale tables
- Query helpers that include fallback tables use `UNION ALL` and suppress fallback duplicates when a primary row exists
- `uploadData()` bundles `sale`, `sale_items`, `payments`, `inventory_items`, `inventory_logs`, `audit_logs` into a single `commit_sale` payload
- `uploadData()` uses the `idempotency_key` on the sale for deduplication
- Re-uploading an already-synced/imported row detected by the sync import marker does not re-invoke Edge Function for that row
- Snapshot import marker prevents duplicate row uploads

---

### MODULE 8: `test/unit/business.service.test.ts`
Test business selection, hydration, and management helpers.

- `loadBusinessSummariesForUser()` composes active membership summaries and owned business summaries
- `createBusiness()` requires a signed-in user
- `createBusiness()` validates non-empty business name
- `createBusiness()` writes the business locally through the PowerSync transaction wrapper and refreshes available business summaries
- `joinBusiness()` attempts remote `validate-join-code` when Supabase client is configured, then falls back to local validation when remote validation is unavailable
- `joinBusiness()` calls `add-member` Edge Function after local membership creation when Supabase client is configured
- `joinBusiness()` fails gracefully when join code is invalid
- `normalizeJoinCode()` trims and uppercases join codes
- `mergeBusinessSummary()` avoids duplicate summaries for the same business
- `resolveSelectableBranch()` prefers the requested branch, falls back to first active branch, and can use fallback branch rows
- `buildFallbackBusinessFromSummary()` and `buildFallbackBranchFromSummary()` create safe local placeholders from summaries
- Active business and branch are cleared from store on sign-out

---

### MODULE 9: `test/unit/product.queries.test.ts`
Test PowerSync query helpers in `src/db/queries/`.

- `buildProductsForBusinessQuery()` returns SQL and parameters for primary/fallback product rows scoped by `business_id`
- Product query SQL includes active products and suppresses fallback duplicates when a primary row exists
- `getProductsForBusiness()` filters products by `business_id`
- `getProductsForBusiness()` filters employee-visible products to `is_active === true`
- `getProductsForBusiness()` filters search terms by name, barcode, or SKU
- `findProductByBarcode()` returns an exact barcode match scoped to business and role visibility
- `findProductById()` returns `null` for a non-existent product ID
- `buildInventoryForBranchQuery()` returns SQL and parameters for primary/fallback inventory rows scoped by `branch_id`
- `buildSaleInventoryLookupQuery()` prefers primary inventory rows and falls back only when no primary row exists for the product/branch pair
- Sales query helpers return current SQL/parameters for business-scoped sales, sale items, and payments including fallback duplicate suppression

---

### MODULE 10: `test/unit/utils.test.ts`
Test formatting, validation, and utility functions in `src/utils/`.

- Email format validation: valid emails pass, invalid emails fail
- Password validation: length >= 8 passes, length < 8 fails
- Currency formatting: `1234.5` formats as expected peso string
- UUID generator returns a valid UUID v4 string
- UUID generator returns unique values across multiple calls
- Date formatting utilities return correct string representations
- Reference number generator produces unique, non-colliding values
- `vat_amount` rounding handles floating point edge cases correctly

---

### MODULE 11: `test/components/SyncStatusBadge.test.tsx`
Test `SyncStatusBadge` component rendering across all sync phases.

- Renders `Syncing` text/indicator when phase is `syncing`
- Renders `Synced` when phase is `ready` and `lastSyncedAt` is not set
- Renders `Synced HH:MM` style text when phase is `ready` and `lastSyncedAt` is set
- Renders `Offline` text when phase is `offline` and `pendingUploadCount` is 0
- Renders `Offline: N pending` when phase is `offline` and `pendingUploadCount > 0`
- Renders danger badge with `lastError` message when phase is `failed`
- Renders warning badge with `lastError` message when phase is `degraded`
- Renders `Syncing` for non-ready/non-error boot phases that fall through to the default badge
- Has correct `accessibilityLabel` on the badge container

---

### MODULE 12: `test/components/CartSheet.test.tsx`
Test `CartSheet` component behavior.

- Renders empty state message when cart has no items
- Renders correct item count when cart has items
- Renders each cart item with name, quantity, and subtotal
- Increment button calls `addItem()` or `setQuantity(id, qty + 1)`
- Decrement button calls `setQuantity(id, qty - 1)`
- Decrement to 0 removes item from cart
- Remove button calls `removeItem(id)`
- Displays subtotal correctly
- Displays total correctly when no discount is applied
- Displays discounted total when discount is applied
- Discount input updates `discountAmount` in store
- Checkout button is accessible with correct `accessibilityRole="button"`
- Checkout button is disabled or shows error when cart is empty

---

### MODULE 13: `test/components/ProductCard.test.tsx`
Test `ProductCard` component rendering and interactions.

- Renders product name and price
- Renders low stock indicator when `stockQuantity <= 5`, matching current component behavior
- Renders out-of-stock state when `stock_quantity === 0`
- Primary card press triggers `onPress(product)` when provided
- Restock/add action button triggers `onAdd(product)` when provided
- Current component does not disable the action button for out-of-stock products; add a test only if app behavior changes
- Does not render archived products (caller responsibility — confirm with a query test)
- Has correct `accessibilityLabel` including product name after accessibility props are added
- Role-specific visibility is caller responsibility today because `ProductCard` does not receive a `role` prop; cover owner/employee behavior in screen-level tests instead

---

### MODULE 14: `test/components/CheckoutScreen.test.tsx`
Test `CheckoutScreen` component logic and user interactions.

- Renders list of cart items with correct totals
- Renders totals currently shown by the screen: subtotal, discount, total, received, and change due
- Payment method selector renders all four methods: `cash`, `gcash`, `maya`, `card`
- Selecting a payment method updates the matching split payment line method
- Single payment amount input updates payment line amount
- Add payment line button adds a new split payment row
- Remove payment line button removes the correct payment row
- Submit button remains pressable but shows a "Payment incomplete" alert when payments do not cover total
- Submit button completes checkout when payments cover or exceed total
- Renders current offline-oriented footer text: "Saving offline. Will sync when connected."
- On successful checkout, navigates to Receipt screen
- On checkout error (e.g. insufficient stock), shows error message
- Confirm button has correct `accessibilityRole="button"`

---

### MODULE 15: `test/components/AuthForms.test.tsx`
Test Login and Signup form components.

- Login form renders email and password inputs
- Login form submit calls `signIn()` with entered credentials
- Login form shows validation error for invalid email format
- Login form shows validation error when password is shorter than 8 characters
- Login form shows Supabase error message on failed auth
- Login form submit button is disabled while auth is in progress
- Signup form renders all required fields
- Signup form submit calls `signUp()` with correct payload
- Forgot Password form renders email input and submit
- All form inputs have `accessibilityLabel` set

---

### MODULE 16: `test/integration/checkout.flow.test.ts`
Test the complete checkout integration flow using mocked PowerSync and Supabase.

- Full happy path: add items to cart → checkout → sale rows created locally
- `sale`, `sale_items`, `payments` rows are all written in the same PowerSync transaction
- `inventory_items.stock_quantity` is decremented for each sale item
- `inventory_logs` row is written for each inventory decrement
- `audit_logs` row is written for the sale completion event
- `idempotency_key` is set on sale and is included when the queued upload is bundled for `commit_sale`
- `vat_amount` on the persisted sale matches formula result
- After successful local write, pending upload count can be reflected when `getUploadQueueStats()` reports queued operations
- Split payment checkout: two payment rows are written with correct methods and amounts
- Cash-only checkout: single payment row written
- Checkout fails atomically: if any write fails, no partial rows are persisted

---

### MODULE 17: `test/integration/offline.checkout.flow.test.ts`
Test current offline checkout behavior: PowerSync local primary-table writes + queued upload behavior.

- When PowerSync is offline, checkout still writes sale data through the local PowerSync transaction path
- Sale is inserted into `sales`, not `fallback_sales`
- Sale items are inserted into `sale_items`, not `fallback_sale_items`
- Payments are inserted into `payments`, not `fallback_payments`
- Inventory decrement updates `inventory_items`, not `fallback_inventory_items`
- `inventory_logs` and `audit_logs` are written locally as part of the same transaction
- `syncStore.pendingUploadCount` reflects the mocked PowerSync upload queue count after local write
- `SyncStatusBadge` shows `Offline: N pending` when phase is `offline` and queue count is non-zero
- When connectivity is restored, `uploadData()` is invoked by the PowerSync connector
- `uploadData()` constructs correct `commit_sale` payload from queued primary-table CRUD rows
- `commit_sale` Edge Function is invoked with `idempotency_key`
- After successful upload, the PowerSync CRUD transaction is completed
- Duplicate upload/imported row attempts detected by sync import markers do not re-invoke the Edge Function for those rows

---

### MODULE 18: `test/integration/auth.flow.test.ts`
Test authentication flow end-to-end with mocked Supabase.

- Cold start: `hydrateSession()` is called, valid token restores auth state
- Cold start: expired/invalid token clears secure store and sets `signed_out` auth state
- Login: successful login sets `authStore` fields: `status`, `userId`, `email`, `fullname`, `role`, and `accessToken`
- Login: failed login does not update auth state and surfaces error
- Login: session is written to `expo-secure-store` after success
- Logout: `supabase.auth.signOut()` is called, secure store is cleared, store reset
- Business hydration: available businesses are loaded after login/session restore
- Role-based navigation: `owner` navigates to owner tab stack
- Role-based navigation: `employee` navigates to employee tab stack
- Session expiry mid-use handling is future work unless an explicit app handler is added

---

### MODULE 19: `test/integration/inventory.flow.test.ts`
Test inventory management integration.

- Product list query returns only active, non-archived products for the business
- Product search by name returns correct filtered results
- Product search by barcode returns exact match
- Adding a new product calls `save_product` Edge Function with correct payload
- Editing a product updates version field and calls `save_product`
- Archiving a product sets `is_archived: true` locally and queues upload
- Restocking a product calls `apply_inventory_adjustment` Edge Function
- Restock offline: adjustment is queued locally and synced later
- Low stock items are correctly identified in inventory list
- Out-of-stock items cannot be added to cart (blocked at UI and validation layer)
- Inventory log is created for every stock change (sale, restock, adjustment)

---

### MODULE 20: `test/integration/employee.flow.test.ts`
Test employee and role management flows.

- Owner can view employee list for their business
- Owner can view employee detail including performance data
- Employee cannot access Employees tab (navigation guard check)
- Employee can only see their own sales in relevant queries
- Adding an employee calls `add-member` Edge Function
- `business_member` row is created with correct role and branch assignment
- Employee performance data (sales count, total revenue) is correctly aggregated
- Owner-only actions (edit product, manage branches) are gated by role check

---

### MODULE 21: `test/integration/sync.lifecycle.test.ts`
Test PowerSync sync lifecycle and status transitions.

- `initializePowerSync()` calls `powersync.init()` and `connect()`
- `connect()` guard: duplicate calls do not start a second stream
- Phase transitions from `booting` → `syncing` → `ready` on successful sync
- Phase transitions to `offline` when `waitForStatus()` times out or network drops
- Phase transitions to `failed` when `uploadData()` throws an error
- Phase transitions to `degraded` when partial sync succeeds with errors
- `lastSyncedAt` is updated on each successful sync
- `pendingUploadCount` reflects `getUploadQueueStats()` result
- Manual sync: calls `waitForFirstSync()` and sets phase correctly
- Manual sync guard: rapid consecutive taps only trigger one sync operation
- On `failed`, badge shows error message; retry manual sync recovers to `ready`

---

## CONFIGURATION FILES TO GENERATE

### `jest.config.ts`
- Preset: `jest-expo`
- Transform: support `.ts`, `.tsx`
- Module name mapper: `@/*` → `<rootDir>/src/*`
- Setup files: `./jest.setup.ts`
- Coverage: Istanbul provider, 80% thresholds for branches/functions/lines/statements
- Test match: `**/*.test.ts`, `**/*.test.tsx`
- Test environment: use the environment expected by `jest-expo` and RNTL; do not force `jsdom` unless the installed RNTL/Jest stack requires it
- Ignore: `node_modules`, `.expo`

### `jest.setup.ts`
- Register React Native Testing Library matchers using the current supported setup for the installed version
- Mock `expo-secure-store`, `expo-file-system`, `expo-sharing`
- Mock `@react-native-async-storage/async-storage` only if it is introduced as a dependency or required by the installed test stack
- Silence known React Native animation warnings
- Set up global factory helpers
- Reset all Zustand stores between tests

---

## TEST PLAN DOCUMENT TO GENERATE

Generate a `TEST_PLAN.md` file with the following sections:

1. **Objectives** — what the test suite validates and why
2. **Scope** — modules in scope and explicitly out of scope (hardware, Supabase Storage, full E2E device)
3. **Test Layers** — description of each layer (unit, component, integration, E2E future)
4. **Risk Matrix** — list each feature/module, its risk level (High/Medium/Low), and the test modules covering it
5. **Coverage Targets** — per-module targets and rationale
6. **Mock Strategy** — how PowerSync, Supabase, Expo modules, and navigation are mocked
7. **Offline Testing Strategy** — how offline scenarios are simulated without a real device
8. **CI Readiness** — confirmation that all tests run without a real device; guidance for adding to GitHub Actions
9. **Future Work** — what to add when Maestro/Detox E2E is ready (hardware, real sync, device transitions)
10. **Naming Conventions** — file naming, describe/it block style, factory usage

---

## OUTPUT INSTRUCTIONS

1. Implement Phase 1 first unless explicitly asked to implement every module. Phase 1 order: mocks → factories → `jest.config.ts` → `jest.setup.ts` → high-value unit tests → high-value component tests → current-behavior checkout/offline integration tests → `TEST_PLAN.md`
2. Every generated file must use TypeScript with full type annotations. No `any` unless absolutely unavoidable, and comment why.
3. All imports must use the `@/*` path alias where applicable.
4. Each test file must have a top-level `describe` block named after the module under test.
5. Use `beforeEach` to reset mocks and Zustand stores before every test.
6. Use `afterEach` to clean up any side effects.
7. Every test must have a clear, human-readable description string in the `it()` / `test()` call.
8. For component tests, use `@testing-library/react-native` render helpers, `userEvent`, `screen`, and `fireEvent`.
9. For async flows, use `await waitFor()` from RNTL.
10. Do not use snapshot testing — use behavioral assertions only.
11. Include `accessibilityLabel` and `accessibilityRole` assertions for every interactive component test.
12. Edge Function mocks must simulate both success (`{ data: {...}, error: null }`) and failure (`{ data: null, error: { message: '...' } }`) cases.
13. PowerSync mock must support both `useQuery` returning an array of results and an empty array, and must expose `execute()` as a jest mock function so call arguments can be asserted.
14. Each integration test that covers an offline scenario must explicitly set the PowerSync mock to simulate `status.connected === false` before the action and `status.connected === true` after to simulate reconnection. The expected current behavior is queued primary-table PowerSync writes, not direct fallback-table writes.
15. After generating all files, output a summary table listing: file path, test count (estimated), and primary concern tested.

## PHASE 1 IMPLEMENTATION SCOPE

Implement these first:

- Jest/RNTL configuration and setup.
- Typed mocks for PowerSync, Supabase, Expo Secure Store/File System/Sharing, and navigation.
- Test factories for core entities used by Phase 1 tests.
- `test/unit/cart.store.test.ts`
- `test/unit/cart.logic.test.ts`
- `test/unit/auth.store.test.ts`
- `test/unit/sync.store.test.ts`
- `test/unit/product.queries.test.ts`
- `test/unit/utils.test.ts`
- `test/components/SyncStatusBadge.test.tsx`
- A focused `test/components/CartSheet.test.tsx` covering render, quantity controls, remove, totals, and checkout navigation.
- A focused `test/components/CheckoutScreen.test.tsx` covering split payment rows, incomplete payment alert, successful checkout navigation, and current footer text.
- `test/integration/checkout.flow.test.ts`
- `test/integration/offline.checkout.flow.test.ts` using current PowerSync local primary-table behavior.
- `TEST_PLAN.md`

Defer these to later phases unless Phase 1 is already stable:

- Full auth form component coverage.
- Full product card role-specific coverage if the component does not currently expose role-specific UI.
- Full business, inventory, employee, and sync lifecycle integration suites.
- Hardware, Supabase Storage, real network sync, Maestro, Detox, and real device offline/online transitions.

---

## BUSINESS RULES NEVER TO VIOLATE IN TESTS

- VAT is always 12% inclusive: `vat = total - (total / 1.12)` rounded to 2 decimal places
- Stock quantity can never go below 0
- A sale cannot be completed without a business, branch, and authenticated user
- `idempotency_key` must be unique per sale and must be sent to `commit_sale`
- Payment sum must be >= total for checkout to succeed
- Only `owner` role can create/edit/archive products, manage employees, or delete branches
- `employee` role can only create sales, view inventory, and access their own settings
- Current offline checkout source of truth is the local PowerSync primary-table transaction and queued CRUD upload. Fallback tables are support tables for existing query/snapshot merge paths, not the direct checkout write target.
- Snapshot import markers must be respected to prevent duplicate uploads
