# AI Testing Prompt Answers

## Offline-First POS System - React Native, PowerSync, Supabase, Expo, TypeScript

These answers were inferred from the current repository.

## 1. Project Structure & Architecture

1. Folder structure:
   - `src/app`: navigation entry and route composition.
   - `src/components`: shared UI, product/search/sync components, charts.
   - `src/config`: runtime configuration helpers.
   - `src/constants`: colors, dimensions, typography.
   - `src/db`: PowerSync transaction wrapper, queries, cleanup/snapshot helpers.
   - `src/features`: screens grouped by domain: auth, business, cart, employees, inventory, sales, settings.
   - `src/hooks`: shared hooks for analytics, cart, products, sales, sync status.
   - `src/powersync`: PowerSync schema, connector, system, upload helpers.
   - `src/services`: auth, business, sync, offline, Supabase, export, remote API services.
   - `src/store`: Zustand stores for auth, business, cart, sync.
   - `src/types`: shared TypeScript models and navigation types.
   - `src/utils`: formatting, validation, UUID, sync debug utilities.
   - `supabase/functions`: Supabase Edge Functions.
   - `supabase/migrations`: database migrations and RLS policies.
   - `powersync`: sync stream/rule YAML.
   - `test`: Node test files.
2. Single Expo project, not a monorepo.
3. State management uses Zustand.
4. Navigation uses React Navigation:
   - Root native stack.
   - Auth stack: `Landing`, `Login`, `Signup`, `ForgotPassword`, `Splash`.
   - Business flow: `BusinessSelection`, `JoinBusiness`, `CreateBusiness`, `BusinessCreated`.
   - Owner tabs: `Inventory`, `Sales`, `Employees`, `Settings`.
   - Employee tabs: `Inventory`, `Sales`, `Settings`.
   - Shared stack screens include `AddProduct`, `EditProduct`, `Checkout`, `Receipt`, `Analytics`, `PerformanceDashboard`, `TransactionDetail`, `EmployeeDetail`, `BranchManagement`, `AuditLog`, `Reports`, `Restock`.
5. TypeScript config:
   - `strict: true`.
   - `moduleResolution: bundler`.
   - `jsx: react-jsx`.
   - `allowJs: true`.
   - Path alias `@/* -> src/*`.
   - Extends `expo/tsconfig.base`.

## 2. PowerSync & Offline Sync

6. PowerSync SDK: `@powersync/react-native` `^1.35.3`.
7. PowerSync schema tables:
   - `profiles`: `fullname`, `email`, `role`, `phone_number`, `avatar_url`, `created_at`.
   - `businesses`: `name`, `owner_id`, `join_code`, `logo_url`, `address`, `is_active`, `created_at`.
   - `branches`: `business_id`, `name`, `is_active`, `created_at`, `updated_at`.
   - `fallback_branches` local-only: same as `branches`.
   - `business_members`: `business_id`, `user_id`, `role`, `branch_id`, `is_active`, `joined_at`.
   - `categories`: `business_id`, `name`.
   - `products`: `business_id`, `category_id`, `name`, `barcode`, `sku`, `selling_price`, `cost_price`, `image_url`, `is_active`, `is_archived`, `version`, `description`, `created_at`, `updated_at`, `created_by`, `last_modified_by`.
   - `fallback_products` local-only: same as `products`.
   - `inventory_items`: `product_id`, `branch_id`, `business_id`, `stock_quantity`, `low_stock_threshold`, `updated_at`.
   - `fallback_inventory_items` local-only: same as `inventory_items`.
   - `inventory_logs`: `product_id`, `branch_id`, `action_type`, `quantity_before`, `quantity_changed`, `quantity_after`, `reference_type`, `reference_id`, `performed_by`, `created_at`.
   - `sales`: `business_id`, `branch_id`, `employee_id`, `total_amount`, `discount_amount`, `payment_method`, `status`, `notes`, `created_at`, `synced_at`, `reference_number`, `vat_amount`, `idempotency_key`.
   - `fallback_sales` local-only: same as `sales`.
   - `sale_items`: `sale_id`, `product_id`, `business_id`, `quantity`, `unit_price`, `subtotal`.
   - `fallback_sale_items` local-only: same as `sale_items`.
   - `payments`: `sale_id`, `business_id`, `method`, `amount_peso`.
   - `fallback_payments` local-only: same as `payments`.
   - `refunds`: `idempotency_key`, `original_sale_id`, `branch_id`, `business_id`, `reason`, `total_peso`, `created_at`, `created_by`, `source_device_id`, `reference_number`.
   - `refund_items`: `refund_id`, `sale_item_id`, `product_id`, `quantity`, `unit_price`, `subtotal`.
   - `audit_logs`: `business_id`, `branch_id`, `actor_id`, `event_type`, `payload`, `created_at`, `source_device_id`.
   - `device_sessions`: `user_id`, `business_id`, `device_id`, `device_name`, `last_seen_at`, `created_at`.
8. Uses a mix:
   - `useQuery()` from PowerSync React hooks for watched UI queries.
   - `powersync.getOptional()` for one-off reads.
   - `tx.execute()` and `powersync.execute()` style writes inside transactions.
   - `powersync.getUploadQueueStats()`, `waitForFirstSync()`, `waitForStatus()`, `connect()`, `disconnect()`.
9. PowerSync is initialized as a singleton in `src/powersync/system.ts` with database file `powersync.db`. It is provided to React through `PowerSyncContext.Provider` in `App.tsx`. `initializePowerSync()` calls `powersync.init()`.
10. No custom row-level conflict resolution is visible. Uploads are bundled through Edge Functions with idempotency keys and upserts for important operations. Otherwise this appears to rely on PowerSync/Supabase behavior.
11. Sync status is stored in `syncStore` and displayed by `SyncStatusBadge`. UI states include `booting`, `unauthenticated`, `syncing`, `ready`, `offline`, `degraded`, and `failed`, with pending upload count, last error, and last synced time.
12. Local-only tables: `fallback_branches`, `fallback_products`, `fallback_inventory_items`, `fallback_sales`, `fallback_sale_items`, `fallback_payments`. There is also a sync import marker helper table created outside the PowerSync schema.
13. There are tests for offline helpers/services and PowerSync helper behavior, but no full simulated device offline/online E2E tests were found.

## 3. Supabase Integration

14. Supabase services used:
   - Auth.
   - Database.
   - Edge Functions.
   - RLS policies in migrations.
   - No clear Storage usage found in the current app code.
   - Realtime is not clearly used directly.
15. Authentication uses email/password via `signInWithPassword()` and `signUp()`. Sessions are persisted in Expo Secure Store.
16. RLS is enabled. General pattern:
   - Members can read business-scoped data.
   - Owners can manage owner/business data.
   - Employees can read their own sales.
   - Active members can create sales.
   - `can_access_business()` checks owner or active membership access.
17. Edge Functions present and/or invoked:
   - `add-member`
   - `apply_inventory_adjustment`
   - `business-summaries`
   - `commit_sale`
   - `create-branch`
   - `create-business`
   - `create_refund`
   - `delete-branch`
   - `delete-business`
   - `save_product`
   - `upsert-profile`
   - `validate-join-code`
   - `write_audit_log`
18. Product models have `image_url`, but no Supabase Storage upload flow was found.
19. Supabase client is a singleton from `src/services/supabaseClient.ts`, created from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Supabase auth persistence/auto-refresh are disabled in the client config because the app persists sessions itself.

## 4. POS Core Features & Modules

20. Major features/modules:
   - Email/password auth and secure session restore.
   - Role-based owner/employee navigation.
   - Business creation, selection, joining, branch context.
   - Inventory/product catalog browsing, product add/edit, archive, restock.
   - Search and barcode lookup helper behavior.
   - Cart/order builder.
   - Checkout with cash, GCash, Maya, and card payment methods.
   - Split payments.
   - Sale creation, sale items, payments, inventory decrements, audit logs.
   - Receipt screen.
   - Sales history, transaction detail, analytics, reports.
   - Employee list/detail and performance dashboard.
   - Branch management.
   - Audit logs.
   - Business deletion and branch deletion helpers.
   - Refund data model and Edge Function support.
   - Manual sync and business data refresh.
21. Exclude or treat cautiously if not fully built:
   - Hardware payment/printing/scanning integrations.
   - Supabase Storage uploads.
   - Full refund UI coverage, unless current screens expose it.
   - True offline/online device transition E2E, unless a test harness is added.

## 5. Components & UI

22. Shared custom UI kit in `src/components/ui`. No NativeWind/Gluestack/Tamagui/React Native Paper found.
23. Critical reusable components:
   - `Screen`
   - `Card`
   - `Badge`
   - `Button`
   - `Input`
   - `ModalSheet`
   - `SectionHeader`
   - `StatCard`
   - `ProductCard`
   - `SearchBar`
   - `SyncStatusBadge`
   - `EmptyState`
   - `BarChart`
   - `DonutChart`
   - `CartSheet`
24. Components with business logic/conditional rendering:
   - `ProductCard` varies by role/action/stock.
   - `CartSheet` handles empty vs populated cart, discount mode, quantity changes.
   - `CheckoutScreen` handles split payments and payment validation.
   - `SyncStatusBadge` varies by sync phase/error/pending uploads.
   - Navigation varies by auth status, active business, and role.
25. No complex gesture-driven interactions found beyond React Native `Pressable` and modal slide animation.
26. Uses custom `ModalSheet` backed by React Native `Modal`. No `@gorhom/bottom-sheet` dependency found.

## 6. Data Flow & Business Logic

27. Core business logic lives across:
   - Zustand stores for UI/session state.
   - Hooks like `useCart`, `useProducts`, `useSales`.
   - Services for auth, business refresh, sync, offline runtime.
   - `src/db/powersync.ts` transaction wrapper for local writes.
   - Query helper modules under `src/db/queries`.
28. Cart logic:
   - `cartStore.addItem()` adds a new item or increments existing quantity.
   - `setQuantity()` updates quantity and removes item when quantity is `<= 0`.
   - `removeItem()` deletes an item.
   - `clearCart()` resets items, payment method, discount, and note.
   - `useCart` computes subtotal from item subtotals and total as `max(0, subtotal - discountAmount)`.
29. Tax/VAT:
   - `createSale()` computes `vat_amount` as `total_amount - total_amount / 1.12`, rounded to two decimals, when not supplied.
30. Discounts:
   - Cart stores `discountAmount`.
   - UI supports fixed amount or percent, but percent is converted to a fixed amount before storing.
   - Total is subtotal minus discount, floored at zero.
31. Split payments:
   - `CheckoutScreen` maintains payment lines with method and amount.
   - Checkout requires received total to cover the total.
   - Payments are written as separate `payments` rows.
32. Completed offline transactions:
   - Checkout writes sale, sale items, payments, inventory changes, inventory logs, and audit logs locally inside a PowerSync transaction.
   - PowerSync queues local CRUD operations.
   - `uploadData()` bundles related rows and invokes `commit_sale` when connectivity/sync is available.
33. No background jobs or scheduled tasks found. Sync runs during initialization/manual sync and PowerSync background upload flow.

## 7. Testing Setup (Current State)

34. Existing tests live in `test/*.test.ts` and use Node's built-in `node:test` plus `node:assert/strict`.
35. Some tests use hand-written mocks/stubs for services/helpers. No full reusable PowerSync or Supabase mock framework was found.
36. Installed test-related tools:
   - Node built-in test runner.
   - No Jest, Vitest, Detox, Maestro, Playwright, React Native Testing Library, or MSW found in `package.json`.
37. No MSW or HTTP mocking library found.
38. No `jest.config.js`, `jest.config.ts`, `jest.setup.js`, or `jest.setup.ts` found.
39. Known edge cases suggested by existing tests:
   - Offline helper behavior.
   - Business hydration and selection.
   - Business/branch deletion.
   - PowerSync upload/manual sync/pull wait helpers.
   - Inventory/product/sale query correctness.
   - `commit_sale` Edge Function idempotency/upsert behavior.
   - POS membership and role vocabulary.

## 8. Testing Scope & Priorities

40. Recommended priority ranking:
   1. Unit tests for business logic, helpers, stores, and query builders.
   2. API/data layer tests for PowerSync transaction wrappers, Supabase function payloads, and query helpers.
   3. Offline scenario tests for local writes, upload queue behavior, sync failures, and queue flush.
   4. Component tests for cart, checkout, inventory, sync badge, auth forms.
   5. Integration tests for major in-app flows.
   6. E2E tests with Maestro/Detox after stable unit/integration coverage exists.
41. Generate test data factories/fixtures. Current tests do not show a shared fixture factory.
42. Prefer behavioral testing over snapshot testing.
43. Yes, tests should cover accessibility labels/roles where components are interactive, especially buttons, forms, modals, and navigation-critical controls.

## 9. Offline-Specific Scenarios

44. Critical offline scenarios to test:
   - Add items to cart while offline.
   - Complete sale offline and verify local rows are created.
   - Sale decrements inventory locally.
   - Split payments are persisted locally.
   - Pending upload count/status updates.
   - Sync later invokes the right Edge Function payload.
   - Manual sync failure sets phase `failed` and stores last error.
   - Missing remote config keeps local offline state available.
   - Inventory restock offline and later upload through `apply_inventory_adjustment`.
45. PowerSync connecting/error behavior:
   - `syncing`: show syncing/uploading state.
   - `failed`: show danger badge with last error.
   - `degraded`: show warning badge with last error.
   - Missing config: set last error stating remote sync is not configured, while local state remains available.
46. Offline UI feedback:
   - `SyncStatusBadge` shows `Offline` or `Offline: N pending`.
   - Checkout footer says sales are saved offline and will sync when connected.
   - Manual sync flows show alerts on failure.

## 10. Payment & External Integrations

47. Payment processors: none found. Payment methods are internal labels: `cash`, `gcash`, `maya`, `card`.
48. Hardware integrations: none found. No receipt printer, barcode scanner SDK, cash drawer, or card reader dependency found.
49. Third-party SDKs likely to mock:
   - `@powersync/react-native`
   - `@supabase/supabase-js`
   - `expo-secure-store`
   - `expo-file-system`
   - `expo-sharing`
   - `@journeyapps/react-native-quick-sqlite`
   - React Navigation hooks
50. External REST APIs outside Supabase: none clearly found.

## 11. Authentication & Authorization

51. User roles: `owner`, `employee`.
52. Restricted screens/actions:
   - Owners see owner tabs including employees/settings administration.
   - Employees see inventory, sales, settings.
   - Owner-only product add/edit and restock flows.
   - RLS restricts business-scoped data by owner/member access.
53. Session persistence:
   - Auth session is serialized to Expo Secure Store under `supabase_session_v1`.
   - On app launch, `hydrateSession()` restores it and sets Supabase auth session.
54. Session expiry mid-use:
   - No explicit mid-use expiry handler was found.
   - On hydration failure, persisted session is cleared and auth state becomes signed out.

## 12. Error Handling & Edge Cases

55. Supabase direct network errors:
   - Auth functions throw Supabase errors.
   - Remote API helper returns structured `RemoteMutationResult` for Edge Function failures.
   - Business refresh/query helpers throw descriptive errors for query failures.
56. No global React error boundary or Sentry/Bugsnag logging service found.
57. Form validations to test:
   - Email format.
   - Password length >= 8.
   - Product price validation.
   - Checkout empty cart, missing business, missing branch, missing user.
   - Checkout split payments must cover total.
   - Inventory cannot go negative.
   - Restock quantity normalization.
   - Business/join code flows.
58. PowerSync query failures:
   - Manual sync catches errors, logs them, sets `lastError`, and sets sync phase `failed`.
   - UI shows failed/degraded status badge.
59. Race conditions/edge risks:
   - Duplicate manual syncs are guarded by `manualSyncPromise`.
   - Connect stream is guarded by `connectStreamPromise`.
   - Upload bundling must keep sale, items, payments, inventory logs, inventory items, and audit logs consistent.
   - Snapshot imports use markers to avoid re-uploading imported rows.

## 13. Performance & Load

60. Large-list candidates:
   - Product catalog/inventory.
   - Sales history.
   - Transaction history/reports.
   - Employees.
   - Audit logs.
61. Uses React Native `FlatList` in inventory and cart. No `FlashList` found.
62. Start with correctness tests. Add performance tests later for large product/sales lists and query helpers if needed.

## 14. CI/CD & Environment

63. No CI/CD pipeline file found in the inspected repository.
64. Environment variables use `.env` and `EXPO_PUBLIC_*` variables. `app.json` includes Expo `extra.eas.projectId`.
65. Generated tests should be runnable in CI without a real device by using Node/Jest-style mocks. Detox/Maestro can be added later.
66. Current local versions:
   - Node.js `v22.18.0`.
   - npm `10.9.3` was reported, though `npm -v` also emitted an access-denied warning from the global npm path.
   - Package manager is npm, with `package-lock.json`.

## 15. Output Preferences for the AI Prompt

67. Prefer a single focused test suite file per module, not one large test runner file.
68. Yes, generated tests should include mock implementations for PowerSync and Supabase where needed.
69. Yes, generate a test plan document in addition to test scripts.
70. Preferred future stack: Jest plus React Native Testing Library for component tests. For the current repo, existing tests use Node's built-in test runner, so initial tests can continue with `node:test` unless adding UI/component testing dependencies is acceptable.
71. Yes, include TypeScript types in generated test files.
72. Yes, generate `jest.config.ts` and `jest.setup.ts` if moving to Jest/React Native Testing Library.
73. Suggested initial target: 80% for business logic/data layer, with higher coverage for checkout, sync, and inventory mutation paths.
74. Suggested naming convention:
   - Current pattern: `test/*.test.ts`.
   - If Jest is introduced: keep `*.test.ts` / `*.test.tsx`, either colocated or under `test/`, but avoid mixing conventions without a migration plan.
