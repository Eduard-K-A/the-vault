# Test Plan

## Objectives

This test suite verifies the current offline-first POS behavior across cart state, checkout, sync status, auth basics, query helpers, and critical utilities. It adds Jest + React Native Testing Library for React Native-focused tests while preserving the existing `node:test` suite for pure logic and static checks.

## Scope

In scope for Phase 1:

- Jest/RNTL infrastructure, mocks, and factories.
- Cart store behavior and derived cart totals.
- Auth store/service basics with mocked Supabase and Secure Store.
- Sync store transitions and status badge rendering.
- Product, inventory, and sales query helper behavior.
- Cart sheet and checkout screen behavior.
- Current checkout integration through PowerSync local primary-table writes.
- Current offline checkout semantics through queued primary-table CRUD uploads.

Out of scope for Phase 1:

- Hardware integrations such as printers, scanners, cash drawers, and card readers.
- Supabase Storage uploads.
- Real network sync against Supabase or PowerSync.
- Maestro/Detox device-level E2E.
- Full employee, business management, refund UI, and report workflow integration suites.

## Test Layers

- **Node unit/static tests:** Existing `test/*.test.ts` files run with `node --test`.
- **Jest unit tests:** New `test/unit/**/*.test.ts` files cover Zustand stores, hooks, pure helpers, and query builders.
- **Jest component tests:** New `test/components/**/*.test.tsx` files use RNTL and behavioral assertions.
- **Jest integration tests:** New `test/integration/**/*.test.ts` files verify coordinated checkout/sync behavior with typed mocks.
- **Future E2E:** Maestro or Detox should cover real device navigation, app launch, hardware, and true offline/online transitions later.

## Risk Matrix

| Area | Risk | Coverage |
| --- | --- | --- |
| Checkout local transaction | High | `test/integration/checkout.flow.test.ts` |
| Offline sync upload bundling | High | `test/integration/offline.checkout.flow.test.ts` |
| Cart totals and mutations | High | `test/unit/cart.store.test.ts`, `test/unit/cart.logic.test.ts`, `test/components/CartSheet.test.tsx` |
| Sync UI state | Medium | `test/unit/sync.store.test.ts`, `test/components/SyncStatusBadge.test.tsx` |
| Auth session basics | Medium | `test/unit/auth.store.test.ts` |
| Product/inventory/sales query helpers | Medium | `test/unit/product.queries.test.ts` |
| Formatting and validation utilities | Low | `test/unit/utils.test.ts` |
| Full role navigation | Medium | Future integration/E2E |
| Hardware and external payment processors | High | Future E2E/hardware harness |

## Coverage Targets

The long-term target is 80% overall coverage and 90%+ for checkout, sync, and inventory mutation paths. Phase 1 prioritizes meaningful behavioral coverage over forcing global thresholds to pass before enough modules are covered.

## Mock Strategy

- PowerSync is mocked in `test/__mocks__/powersync.ts`, including query data, optional rows, upload queue stats, status, CRUD transactions, and database methods.
- Supabase is mocked in `test/__mocks__/supabase.ts`, including auth methods, Edge Function invocation, and table query stubs.
- Expo Secure Store, File System, and Sharing are mocked in `test/__mocks__/expoModules.ts`.
- React Navigation hooks are mocked in `test/__mocks__/navigation.ts`.
- Factories in `test/factories/models.ts` generate typed POS entities with override support.
- `test/helpers/resetStores.ts` resets Zustand state between tests.

## Offline Testing Strategy

Offline checkout currently writes through PowerSync local primary-table transactions. Tests must not assert direct checkout writes to `fallback_sales`, `fallback_sale_items`, `fallback_payments`, or `fallback_inventory_items` unless the app implementation changes.

Offline scenarios are simulated by:

- Setting the PowerSync mock status to disconnected.
- Setting `syncStore.phase` to `offline`.
- Setting mocked upload queue counts.
- Asserting primary-table local transaction behavior.
- Invoking `SupabasePowerSyncConnector.uploadData()` with a mocked CRUD transaction to verify `commit_sale` payload bundling and transaction completion.

Fallback table tests are limited to current query/snapshot support behavior, such as primary/fallback unions and duplicate suppression.

## CI Readiness

The test suite is designed to run without a real device:

- Existing tests: `npm test`
- Jest suite: `npm run test:jest`
- TypeScript: `npm run typecheck`

`npm run lint` is expected to join CI once the repo has an ESLint 10 flat config (`eslint.config.*`). The current repository does not include that config yet, so lint currently exits before source files are checked.

On this Windows environment, `npm.ps1` can emit an access-denied warning for the global npm path even when commands exit successfully. CI should use a clean Node/npm installation or direct local binaries if that warning appears.

## Future Work

- Add full auth form component coverage.
- Add business, inventory management, employee, refund, and sync lifecycle integration suites.
- Add Maestro or Detox E2E for real app launch, role navigation, and device offline/online transitions.
- Add hardware integration tests when printer/scanner/payment SDKs exist.
- Add Supabase Storage tests if product image uploads are implemented.
- Add performance tests for large product and sales lists.

## Naming Conventions

- Existing Node tests remain under `test/*.test.ts`.
- New Jest unit tests live under `test/unit/*.test.ts`.
- New Jest component tests live under `test/components/*.test.tsx`.
- New Jest integration tests live under `test/integration/*.test.ts`.
- Use top-level `describe()` blocks named after the module or flow under test.
- Use behavioral assertions rather than snapshots.
