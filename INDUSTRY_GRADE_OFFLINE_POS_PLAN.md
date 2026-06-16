# Industry-Grade Offline-First POS Mobile Application Plan

## Purpose

This document defines a concrete production roadmap for turning this Expo React Native, TypeScript, PowerSync, and Supabase POS application into an industry-grade offline-first mobile POS.

The target outcome is a mobile POS that can complete sales reliably without internet, recover safely after app/device failure, sync exactly once when connectivity returns, preserve inventory and payment integrity, enforce authorization on the backend, and provide enough observability for support and operations.

## Current Baseline

The repository currently has:

- Expo React Native mobile app with TypeScript.
- PowerSync local database and Supabase backend.
- Zustand-based stores for auth, business, cart, and sync state.
- POS flows for cart, checkout, inventory, sales, employees, settings, and reporting screens.
- Local checkout path writing sale, sale item, payment, inventory, and audit rows locally.
- Current checkout writes to synced primary PowerSync tables (`sales`, `sale_items`, `payments`, `inventory_items`, `inventory_logs`, `audit_logs`). Local-only fallback tables exist for bootstrap/query fallback support and should not become the checkout write target unless the app architecture changes.
- Supabase Edge Function upload path for bundled sale commits.
- Phase 1 Jest tests for cart, checkout, sync status, auth store basics, query helpers, and offline checkout/upload behavior.
- Existing `node:test` tests for pure logic and static helpers.
- Current role vocabulary is `owner` and `employee`.
- Current sale business status vocabulary is `pending`, `completed`, `cancelled`, `voided`, and `refunded`.
- Current payment amount field is `amount_peso`.
- Current inventory log fields use `action_type`, `quantity_changed`, and `performed_by`.

Known baseline gaps:

- Lint is blocked because ESLint 10 requires an `eslint.config.*` flat config.
- No real-device E2E test suite yet.
- No complete production sync failure/recovery UI.
- No formal transaction sync lifecycle model separate from `sales.status`.
- No full RLS/Edge Function test suite.
- No production observability integration yet.

## Guiding Principles

1. Local checkout must be fast, atomic, and durable.
2. A completed sale must never disappear because the network is down.
3. Sync retries must be idempotent and safe.
4. Inventory must be derived from auditable movements, not silent overwrites.
5. Backend authorization must not trust client state.
6. Operators need clear sync status, failure recovery, and support diagnostics.
7. Tests must cover the highest-risk business paths before broad UI coverage.
8. Production release should be gated by repeatable CI checks and real-device validation.

## Production Readiness Definition

The app is production-ready when all of the following are true:

- A cashier can complete cash sales offline for a full shift.
- Sales created offline sync exactly once after reconnecting.
- App restart during or after checkout does not duplicate or lose a transaction.
- Failed uploads are visible, retryable, and diagnosable.
- Inventory movement history can explain every stock change.
- Role-restricted actions are enforced by Supabase RLS or Edge Functions, not only by UI.
- Payments, refunds, voids, discounts, and stock adjustments are audited.
- CI runs typecheck, unit tests, integration tests, lint, and backend tests.
- Real-device E2E covers offline checkout, restart, reconnect, and sync.
- Production error reporting and support diagnostics are available.

---

## Phase 1: Stabilize Tooling and Quality Gates

### Goals

Make the development workflow predictable and make CI able to reject unsafe changes before they reach production.

### Work Items

1. Add ESLint 10 flat config.
   - Create `eslint.config.js` or `eslint.config.mjs`.
   - Include TypeScript and React Native rules.
   - Ignore generated folders: `node_modules`, `.expo`, `dist`, `web-build`, `android`, `ios`, `coverage`.
   - Keep the first pass pragmatic: catch correctness issues, unused code, unsafe globals, and import problems.

2. Add CI pipeline.
   - Use GitHub Actions or the repo's chosen CI provider.
   - Run:
     - `npm ci`
     - `npm test`
     - `npm run test:jest`
     - `npm run typecheck`
     - `npm run lint`
   - Upload Jest coverage artifact without enforcing global coverage yet.

3. Add dependency guardrails.
   - Keep `react` pinned exactly to the version required by `react-native`.
   - Add a CI step for `npm ls react react-native`.
   - Review npm audit output and classify vulnerabilities as actionable, accepted, or blocked.

4. Add pre-release verification command.
   - Add `npm run verify`.
   - It should run legacy tests, Jest tests, typecheck, and lint.

### Acceptance Criteria

- `npm run lint` checks source files instead of failing on missing config.
- CI passes on the current branch.
- React and React Native renderer versions remain compatible after fresh install.
- A developer can run one command locally to validate the app before pushing.

---

## Phase 2: Formalize Transaction and Sync Lifecycle

### Goals

Make checkout and sync state explicit so the app can recover from app kills, crashes, duplicate taps, sync retries, and partial backend failures. Keep business lifecycle and sync lifecycle separate: `sales.status` should continue to describe the sale's business state, while new sync fields describe upload/reconciliation state.

### Data Model Additions

Keep or formalize the existing business fields on `sales`:

- `id`: UUID generated locally.
- `business_id`
- `branch_id`
- `employee_id`
- `reference_number`
- `idempotency_key`: unique stable key generated before local commit.
- `status`: current business status, constrained to `pending`, `completed`, `cancelled`, `voided`, `refunded`.
- `created_at`
- `synced_at`

Add sync-specific fields to `sales` or to a related local sync state table. Do not replace `sales.status` with sync states.

- `sync_status`: `local_only`, `sync_pending`, `syncing`, `synced`, `sync_failed`, `needs_review`.
- `sync_attempt_count`
- `last_sync_error_code`
- `last_sync_error_message`
- `last_sync_error_at`
- `last_sync_attempt_at`
- `server_confirmed_at`

Add payment lifecycle fields to `payments` rather than mixing them into `sales.status`:

- `status`: `pending`, `paid`, `failed`, `refunded`, `partially_refunded`.
- `provider`
- `provider_reference`
- `synced_at`

Add or formalize the following for sync attempts:

- `id`
- `entity_type`: `sale`, `refund`, `inventory_adjustment`, `product_update`, etc.
- `entity_id`
- `idempotency_key`
- `attempt_number`
- `status`: `started`, `succeeded`, `failed`
- `error_code`
- `error_message`
- `request_payload_hash`
- `created_at`

### Checkout Rules

1. Generate sale ID and idempotency key before any local writes.
2. Write sale, sale items, payments, inventory update, inventory log, and audit log in one local transaction.
3. Prevent duplicate checkout submission while the transaction is committing.
4. After local transaction succeeds, clear cart and navigate to receipt.
5. If sync is offline or fails, keep sale visible with `sales.status = completed` and sync state `sync_pending` or `sync_failed`.
6. Upload retries must use the same idempotency key.

### Recovery Rules

On app start:

1. Scan for local sales with `sync_status` values `local_only`, `sync_pending`, `syncing`, `sync_failed`, or `needs_review`.
2. Recompute pending upload counts.
3. Show sync status and failed sync count.
4. Do not duplicate local rows.
5. Do not auto-clear failed rows without successful backend confirmation.

### Tests

Add Jest integration tests for:

- Double-tap checkout does not create duplicate sale.
- App restart after local checkout preserves pending sale.
- Upload retry uses the same idempotency key.
- Upload failure marks sync error but preserves local sale.
- Successful retry transitions sale to synced.

### Acceptance Criteria

- Every sale has clear business and sync lifecycle state.
- Business status and sync status are not conflated.
- Offline completed sales remain visible after app restart.
- Failed sync attempts are inspectable.
- Duplicate submit and retry paths cannot double-post a sale.

---

## Phase 3: Harden PowerSync and Supabase Uploads

### Goals

Make local-to-remote sync deterministic, idempotent, and supportable.

### Edge Function Contract

The `commit_sale` Edge Function should continue to accept the current bundled primary-table payload:

- `sale`
- `sale_items`
- `payments`
- `inventory_items` or inventory movement references
- `inventory_logs`
- `audit_logs`
- `client_context`
  - `device_id`
  - `app_version`
  - `local_created_at`
  - `sync_attempt_id`

The function must:

1. Authenticate the user.
2. Check business membership and role.
3. Validate branch access.
4. Validate sale idempotency key.
5. Upsert or return existing sale for duplicate idempotency key.
6. Apply inventory item updates and inventory logs atomically.
7. Write audit logs.
8. Return a stable result:
   - `sale_id`
   - `already_committed`
   - `synced_at`
   - `server_reference_number` if applicable

### Upload Error Classification

Classify errors into:

- `network_unavailable`: retry automatically.
- `timeout`: retry automatically with backoff.
- `auth_expired`: pause and require re-auth.
- `permission_denied`: mark failed and require manager/admin support.
- `validation_failed`: mark failed and surface details.
- `conflict_requires_review`: mark failed and show review action.
- `server_error`: retry with backoff and alert if repeated.

### Retry Policy

- Retry network/timeouts automatically.
- Use exponential backoff with jitter.
- Stop automatic retry after a configurable threshold.
- Keep manual retry available for authorized users.
- Never generate a new idempotency key for the same sale retry.

### Tests

Add tests for:

- Successful `commit_sale`.
- Duplicate idempotency key returns existing sale.
- Permission denied blocks unauthorized employee.
- Auth expired pauses upload.
- Network timeout retries without duplicating rows.
- Validation failure is visible in sync diagnostics.

### Acceptance Criteria

- Sale upload can be retried safely.
- Backend cannot commit a sale for a business/branch the user cannot access.
- Upload failures are classified and shown clearly.
- Support can identify why a sale is not syncing.
- Uploads remain based on queued primary-table PowerSync CRUD rows for checkout.

---

## Phase 4: Inventory as Auditable Movements

### Goals

Make inventory accurate across offline sales, restocks, adjustments, refunds, voids, and multi-device sync.

### Inventory Model

Use the existing `inventory_logs` table as the movement ledger. Keep current field names where practical and add fields only when they remove ambiguity. Each movement should include:

- `id`
- `business_id`: add this to `inventory_logs` if backend queries and RLS need direct business scoping.
- `branch_id`
- `product_id`
- `action_type`: current field; extend vocabulary to `sale`, `refund`, `void`, `restock`, `adjustment`, `transfer_in`, `transfer_out`, `initial`.
- `quantity_changed`: current field; use negative values for sale/transfer-out and positive values for restock/refund/transfer-in.
- `quantity_before`
- `quantity_after`
- `reference_type`
- `reference_id`
- `reason`
- `performed_by`: current field; user ID responsible for the movement.
- `created_at`
- `synced_at`

### Business Rules

1. Sales create negative inventory movements.
2. Refunds/voids create positive inventory movements when stock is returned.
3. Restocks create positive movements.
4. Manual adjustments require reason and role authorization.
5. Negative stock policy must be explicit:
   - Option A: block negative stock.
   - Option B: allow only manager override.
   - Option C: allow negative stock but flag it.

Recommended default: block negative stock for ordinary cashiers, allow manager override with audit log.

### Multi-Device Conflict Strategy

- Do not rely on raw stock overwrite conflicts.
- Reconcile by movement history.
- If two devices sell the last item offline, allow both local sales if policy permits, then flag negative stock after sync.
- If policy blocks negative stock, enforce against the last known local stock and add manager review if server reconciliation detects a deficit.

### Tests

Add tests for:

- Sale decreases stock through movement log.
- Refund increases stock through movement log.
- Restock updates stock and audit trail.
- Manual adjustment requires reason.
- Negative stock blocked for cashier.
- Negative stock manager override creates audit log.
- Multi-device sale conflict produces review state.

### Acceptance Criteria

- Every stock change has an explainable movement record.
- Inventory reports can be reconstructed from movements.
- Offline conflicts do not silently overwrite stock.
- Manager overrides are audited.
- Existing `inventory_items.stock_quantity` remains the fast-read projection; `inventory_logs` is the audit source.

---

## Phase 5: Payments, Refunds, Voids, and Reconciliation

### Goals

Separate sale lifecycle from payment lifecycle and support realistic POS operations.

### Payment Model

Each payment row should include:

- `id`
- `sale_id`
- `business_id`
- `branch_id`
- `method`: current values are `cash`, `gcash`, `maya`, and `card`.
- `amount_peso`: keep the current field name for PHP-denominated payments.
- `currency`: add only if multi-currency support becomes a real requirement; otherwise PHP is implied by `amount_peso`.
- `status`: `pending`, `authorized`, `captured`, `failed`, `refunded`, `partially_refunded`
- `provider`
- `provider_reference`
- `offline_approved`
- `created_at`
- `synced_at`

New methods such as `bank_transfer` should be added through an explicit type/schema migration.

### Cash Payments

- Can complete offline.
- Require cash drawer/shift association when shift management exists.
- Must be included in end-of-shift reconciliation.

### External Payments

For cards/e-wallets:

- Do not assume payment succeeded from UI state alone.
- Store provider result, reference ID, and status.
- Handle timeout ambiguity:
  - Payment may have succeeded but response was lost.
  - Reconcile with provider before retrying capture.

### Refunds and Voids

Rules:

- Void before settlement when allowed.
- Refund after settlement.
- Partial refund must link to original sale item/payment.
- Refund creates audit log and inventory movement if item returns to stock.
- Role restrictions apply.

### Tests

Add tests for:

- Cash sale offline.
- Split payment totals.
- Incomplete payment blocked.
- Payment timeout creates review state.
- Refund creates payment reversal and inventory movement.
- Void marks sale voided and reverses inventory.
- Duplicate refund request blocked by idempotency.

### Acceptance Criteria

- Sale and payment state can be reconciled independently.
- Refunds and voids are traceable and role-protected.
- Ambiguous external payment states do not double-charge customers.

---

## Phase 6: Authentication, Authorization, and RLS

### Goals

Ensure every sensitive action is protected on the backend, even if a client is modified.

### Roles

Recommended role model:

- `owner`: full business access.
- `manager`: branch operations, refunds/voids, stock adjustments, employee view.
- `cashier`: sales, cart, checkout, receipt, limited product read.
- `inventory_clerk`: inventory and restock actions, no refund/void unless granted.

The current app uses `owner` and `employee`. Production hardening should first map current permissions explicitly:

- `owner`: existing full-access role.
- `employee`: existing broad staff role.

Then introduce finer roles behind a schema/type migration:

- `employee` can be retained as a legacy alias during migration.
- New rows should use `cashier`, `manager`, or `inventory_clerk` once the app and RLS policies support them.
- Backend policies must accept both old and new roles during the migration window.

### RLS Policy Pattern

Every business-scoped table must enforce:

- User is authenticated.
- User belongs to the business.
- User has required role/action permission.
- Branch-scoped actions validate branch membership or access.

Edge Functions must also validate:

- JWT/session.
- Business membership.
- Branch access.
- Role permission for action.
- Request payload business/branch IDs match authorized scope.

### Session Handling

The app must handle:

- Valid session at app start.
- Expired session while browsing.
- Expired session during pending upload.
- Offline app start with previously authenticated user.
- Logout with pending local uploads.

Recommended behavior:

- Allow offline POS operation only for a previously authenticated session with local role context.
- Pause remote upload when token expires.
- Require re-auth before syncing sensitive pending mutations.
- Warn before logout if unsynced transactions exist.

### Tests

Add tests for:

- Cashier cannot void/refund without permission.
- Manager can approve override.
- Expired session pauses upload.
- Re-auth resumes upload with same idempotency keys.
- RLS denies cross-business table reads/writes.
- Edge Functions reject mismatched business_id payload.

### Acceptance Criteria

- Client-only role bypass cannot perform protected backend actions.
- Expired sessions do not lose pending sales.
- Cross-business data access is blocked in tests.

---

## Phase 7: Sync and Support Diagnostics UI

### Goals

Give operators and support staff clear visibility into offline/sync health.

### Required UI

1. Global sync indicator.
   - Online and synced.
   - Offline.
   - Syncing.
   - Pending uploads count.
   - Failed uploads count.
   - Last synced time.

2. Sync diagnostics screen.
   - Device ID.
   - App version/build number.
   - Active business/branch.
   - Auth status.
   - PowerSync connection status.
   - Pending upload count.
   - Failed upload count.
   - Last successful upload.
   - Last error code/message.
   - Retry failed uploads button.
   - Export diagnostics button.

3. Failed transaction detail.
   - Sale reference.
   - Local created time.
   - Sync attempts.
   - Error classification.
   - Suggested operator action.
   - Retry action if safe.

### Operator Messaging

Use plain language:

- "Offline: sales are saved on this device."
- "3 sales waiting to sync."
- "1 sale needs attention."
- "Sign in again to sync pending sales."
- "This sale is saved locally but has not reached the server yet."

### Tests

Add component and integration tests for:

- Offline banner.
- Pending count display.
- Failed upload display.
- Retry button calls sync retry service.
- Auth-expired sync state prompts re-auth.
- Diagnostics export masks tokens/secrets.

### Acceptance Criteria

- A cashier knows whether a sale is locally saved or server synced.
- A manager can identify failed uploads.
- Support can diagnose sync problems without database access.

---

## Phase 8: Observability and Error Reporting

### Goals

Make production failures visible, traceable, and actionable.

### Client Observability

Add an error reporting service such as Sentry or Bugsnag.

Capture:

- Unhandled JS exceptions.
- React error boundary failures.
- Checkout failure traces.
- Sync upload failures.
- App version/build.
- Device info.
- Business/branch IDs only when safe.
- Sale ID/reference for transaction errors.

Never capture:

- Passwords.
- Access tokens.
- Refresh tokens.
- Full customer payment details.
- Sensitive customer PII beyond what is approved.

### Structured Logs

Use trace IDs for:

- Checkout attempt.
- Local transaction commit.
- Upload attempt.
- Edge Function invocation.
- Retry attempt.

Recommended trace fields:

- `trace_id`
- `sale_id`
- `idempotency_key`
- `business_id`
- `branch_id`
- `device_id`
- `phase`
- `error_code`

### Error Boundary

Add a global error boundary that:

- Shows a recovery screen.
- Allows restart/navigation reset.
- Logs error.
- Does not wipe local pending transactions.

### Acceptance Criteria

- Production crashes are reported with build and device context.
- Sync failures can be correlated across client and backend.
- Sensitive data is not leaked in logs.

---

## Phase 9: Backend and Database Hardening

### Goals

Make backend schema, policies, functions, and migrations production-safe.

### Supabase Requirements

1. RLS enabled on all business-scoped tables.
2. Policies tested locally.
3. Edge Functions validate payloads with explicit schemas.
4. Database constraints enforce critical invariants:
   - Unique sale idempotency key per business.
   - Unique payment provider reference where applicable.
   - Foreign key relationships.
   - Non-negative amounts.
   - Valid enum/status values.

### Migration Requirements

1. Migrations are versioned and reviewed.
2. Local PowerSync schema changes are backward compatible where possible.
3. App startup handles older local database versions.
4. Migration failure shows a recoverable error state.
5. Migration tests cover upgrade with existing local data.

### Backup and Recovery

Add a support-safe export for unsynced local transactions:

- Export pending sales.
- Export failed sync attempts.
- Export app/database version.
- Exclude tokens and secrets.
- Mark export as sensitive operational data.

### Acceptance Criteria

- Backend constraints prevent duplicate or invalid critical rows.
- RLS tests prove cross-business isolation.
- App upgrades do not destroy pending local sales.

---

## Phase 10: E2E, Load, and Reliability Testing

### Goals

Validate the app under real mobile conditions and realistic POS workloads.

### E2E Stack

Choose one:

- Maestro: recommended first for fast mobile flow coverage.
- Detox: stronger for deeper React Native control, higher setup cost.

Recommended path:

1. Start with Maestro for offline checkout, restart, reconnect, and role navigation.
2. Add Detox only if Maestro cannot validate critical app internals.

### Required E2E Scenarios

1. Login as cashier.
2. Open product catalog.
3. Add item to cart.
4. Complete cash checkout online.
5. Toggle device offline.
6. Complete cash checkout offline.
7. Kill and restart app.
8. Verify offline sale remains visible/pending.
9. Restore network.
10. Verify sale syncs once.
11. Verify receipt/order history.
12. Attempt restricted manager action as cashier and confirm blocked.

### Load Tests

Create fixture datasets for:

- 500 products.
- 5,000 products.
- 1,000 sales.
- 10,000 sales.
- 30 days of inventory logs.

Measure:

- Product list render time.
- Search latency.
- Cart add/remove latency.
- Checkout local transaction time.
- App startup time with pending uploads.
- Sync diagnostics load time.

### Reliability Tests

Test interruption points:

- App killed before local checkout commit.
- App killed after local commit before navigation.
- App killed during upload.
- Token expires during upload.
- Network drops during upload.
- Edge Function returns 500.
- Device storage low/full.

### Acceptance Criteria

- Critical E2E flows pass on a real dev client or release candidate build.
- Product list remains usable with target catalog size.
- Checkout remains fast under expected local data volume.
- Interruption tests do not duplicate or lose sales.

---

## Phase 11: Release, Operations, and Compliance

### Goals

Prepare the app for controlled rollout and ongoing operations.

### Environments

Use separate environments:

- Development.
- Staging.
- Production.

Each environment must have:

- Separate Supabase project or isolated database.
- Separate PowerSync configuration.
- Separate Edge Function deployment.
- Separate environment variables.
- Clearly visible app build/environment label outside production.

### Release Gates

A release candidate must pass:

- `npm run verify`
- Supabase local tests.
- Edge Function tests.
- E2E offline checkout scenario.
- Manual smoke test on physical Android device.
- Manual smoke test on target iOS device if iOS is supported.
- Migration test from previous production version.

### Rollout Strategy

1. Internal dogfood.
2. Single pilot branch/location.
3. Limited production rollout.
4. Full production rollout.

During pilot:

- Monitor crash-free sessions.
- Monitor failed upload count.
- Monitor duplicate idempotency attempts.
- Monitor sync latency.
- Review support diagnostics exports.

### Operational Runbooks

Create runbooks for:

- Pending sales not syncing.
- Auth expired with pending sales.
- Duplicate sale suspected.
- Inventory mismatch.
- Refund failed.
- Device lost with unsynced transactions.
- Supabase outage.
- PowerSync outage.

### Acceptance Criteria

- Release process is repeatable.
- Operators know what to do during sync/backend outages.
- Support can diagnose critical issues without developer intervention.

---

## Testing Roadmap

### Existing Test Layers

- `npm test`: legacy `node:test` suite for pure logic/static checks.
- `npm run test:jest`: Jest unit/component/integration suite.
- `npm run test:coverage`: Jest coverage report without global thresholds.
- `npm run typecheck`: TypeScript validation.

### Near-Term Additions

1. Lint CI once ESLint config exists.
2. Edge Function tests for `commit_sale`.
3. Supabase RLS policy tests.
4. Offline retry/failure integration tests.
5. Maestro E2E for real offline checkout.

### Coverage Priorities

Highest priority:

- Checkout.
- Offline transaction persistence.
- Sync upload and retry.
- Idempotency.
- Inventory movement.
- Refund/void.
- Authorization.

Lower priority:

- Visual snapshots.
- Static presentation components.
- Marketing or non-POS screens.

## Suggested Commit Plan

Use small conventional commits:

1. `chore(lint): add eslint flat config`
2. `ci: add verification workflow`
3. `feat(sync): track transaction sync lifecycle status`
4. `test(sync): cover checkout retry idempotency`
5. `feat(inventory): model stock movements`
6. `test(inventory): cover stock movement reconciliation`
7. `feat(payments): add payment lifecycle states`
8. `feat(auth): enforce role permissions in protected flows`
9. `feat(sync): add diagnostics screen`
10. `chore(observability): add production error reporting`
11. `test(e2e): add offline checkout flow`

## Immediate Next Actions

Recommended next sprint:

1. Add ESLint flat config and `npm run verify`.
2. Add CI workflow for install, tests, typecheck, and lint.
3. Add transaction sync lifecycle fields for local sales.
4. Add tests for duplicate checkout prevention and upload retry idempotency.
5. Add Edge Function tests for `commit_sale`.

This order improves safety first, then addresses the highest-risk production path: offline checkout and exactly-once sync.
