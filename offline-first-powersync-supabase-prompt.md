# Offline-First PowerSync + Supabase Architecture
# Cellphone Accessories POS - Production Implementation Prompt

---

## Agent Instructions

You are a senior mobile/backend architect specializing in offline-first systems, distributed data,
and secure multi-tenant POS applications. Produce an implementation-ready architecture document.
Do not produce theoretical overviews. Every section must contain actionable decisions, concrete
schema, real pseudo-code, and explicit reasoning. Where a choice must be made, make it and defend it.

This document is the source of truth for the system. It must be strict enough that an engineer can
implement the application without inventing missing rules.

---

## System Context

- **Domain:** Point-of-sale and inventory management for cellphone accessories retail
  (mobile phones, chargers, cases, cables, screen protectors, and accessories with variants
  such as color and device-model compatibility).
- **Connectivity:** Offline-first. The app must remain usable with zero internet connectivity.
  Sync happens opportunistically when connectivity is available.
- **Scale:** Multiple independent businesses (tenants). Each business has one or more branches.
  Each branch has one or more employees.
- **Devices:** Android and iOS mobile devices. Budget Android devices must be supported.
  Assume 2-3 GB RAM floor.
- **Roles:** Exactly two roles: `owner` and `employee`. No manager role exists.
- **Payments:** Cash, GCash, Maya, and card. Split payment (multiple methods per sale) must
  be supported.
- **Tax:** Philippines VAT-inclusive pricing. Store final price paid as Peso decimals.
  Derive VAT breakdown on demand using 12% VAT math.
- **Receipt:** No print flow. Generate a `reference_number` such as `TXN-20260601-0042` per sale.
  Customer photographs screen if needed.
- **No hardware integration:** No receipt printers, no cash drawers, no barcode scanners.
  The app is the only interface.

### Currency Rule

All monetary values are stored as **Peso decimals** with centavo precision.

- **Postgres:** use `NUMERIC(12,2)` or equivalent money-safe decimal fields.
- **Local SQLite:** store synchronized monetary values as canonical decimal strings, not `REAL`.
- **Client math:** convert to a decimal-safe helper before arithmetic; do not use raw floating-point
  addition/subtraction on persisted money values.
- **UI formatting:** display in `PHP` locale.
- **Rounding:** round only at persistence boundaries and in explicit financial calculations.

Never store money as floating-point approximate values in a way that changes totals between
client and server. If the platform uses JSON, serialize values as decimal numbers with two
fractional digits.

SQLite mapping rule:

- If PowerSync maps a Postgres money column to `REAL`, do not use that field directly for financial
  calculations.
- Use a text-backed local representation or a serialized decimal helper layer so the client keeps
  exact `149.10`-style values without binary floating-point drift.
- Any helper used for totals, discounts, VAT, refunds, or split payments must round deterministically
  to two decimal places at the edge of persistence and display.

---

## Role Capability Matrix

This matrix is authoritative. All RLS policies, API guards, sync rules, and UI permission
checks must derive from it. Do not invent additional roles or permissions.

| Action                              | Owner | Employee |
|-------------------------------------|-------|----------|
| Process a sale                      | Yes   | Yes      |
| Cancel a sale before payment        | Yes   | Yes      |
| Apply discounts                     | Yes   | Yes      |
| Refund a completed sale             | Yes   | Yes, own sales only |
| Add / edit / archive products       | Yes   | Yes      |
| Adjust inventory manually           | Yes   | Yes      |
| View inventory levels               | Yes   | Yes      |
| View own sales records              | Yes   | Yes      |
| View all branch sales records       | Yes   | No       |
| View all employees' sales records   | Yes   | No       |
| View branch-level reports           | Yes   | No       |
| Add / remove employees              | Yes   | No       |
| Create / manage branches            | Yes   | No       |
| View audit logs                     | Yes   | No       |
| Export data                         | Yes   | No       |

Critical guard:

- Employees can refund only their own sales.
- This is enforced in Postgres RLS and server-side validation.
- UI hiding is defense in depth only.

Void vs refund:

- **Cancel before payment:** sale record can be removed or marked cancelled before any payment is committed.
- **Refund after payment:** create a new counter-transaction referencing the original sale.
- Do not implement void as a separate post-payment concept.

---

## Tenancy Model

Use **shared schema with `business_id` row-level isolation**.

Hierarchy:

```text
business
  └── branch
        └── branch_members (user ↔ branch ↔ role)
```

- An owner belongs to a business and has cross-branch visibility inside that business only.
- An employee belongs to one or more branches within a business.
- No user ever accesses data outside their business.
- Branch isolation is enforced for employees.
- Owners bypass branch isolation within their business.

---

## 1. Executive Summary

This system uses **PowerSync as the offline sync and local cache layer** and **Supabase as the
secure source of truth**. The client app reads exclusively from a local SQLite database managed
by PowerSync. All writes follow a two-phase pattern:

1. optimistic local write for immediate UI feedback
2. authoritative mutation through Supabase with idempotent commit semantics

Core principles:

1. Local reads are always fast.
2. Writes are always validated server-side.
3. All mutations are idempotent.
4. Conflict resolution is per entity, not generic.
5. The outbox is the source of truth for pending writes.
6. Audit logs are server-side only.
7. Client-side permission checks are UX only, never security boundaries.
8. No security-critical rule may depend solely on client state.

---

## 2. System Architecture

### Layers

```text
CLIENT UI
  Reads from local SQLite only
  Writes optimistic local state + outbox

LOCAL PERSISTENCE
  SQLite managed by PowerSync SDK
  Synced entities + local outbox + local UI cache

SYNC ENGINE
  PowerSync client SDK
  Replicates server data to local SQLite
  Does not own mutation authority

API AND AUTH
  Supabase Auth
  Supabase Edge Functions
  All business logic validated here

DATABASE
  Postgres with RLS enabled on all tables
  Source of truth for all data
  Transaction functions for atomic operations

RECONCILIATION
  Outbox processor
  Retry/backoff
  Dead-letter handling
  Conflict resolution UI
  Stale mutation review
```

### Write Path

1. User action in UI.
2. Create optimistic local record.
3. Append mutation to outbox with `idempotency_key`.
4. UI immediately reflects pending state.
5. Outbox worker sends mutation to Supabase Edge Function.
6. Edge Function validates authorization, idempotency, and business rules.
7. Postgres commits atomically.
8. Edge Function returns success or structured error.
9. On success, mark outbox entry confirmed.
10. PowerSync replication updates local SQLite with authoritative server state.
11. Replace optimistic state with confirmed state.
12. If server adjusts values, UI must reflect authoritative result.

### Offline Write Path

1. User action in UI.
2. Create optimistic local record.
3. Append mutation to outbox.
4. UI shows pending state.
5. Outbox worker pauses while offline.
6. On reconnect, worker resumes in FIFO order.
7. Process entries with retry/backoff.
8. If a mutation fails, mark it failed and keep the user-visible reason.
9. If a mutation is stale or conflict-prone, surface review UI before retry.

### Read Path

All reads come from local SQLite. The app never queries Supabase directly for reads.

### Sync Lifecycle

```text
App launch
  -> Authenticate with Supabase Auth
  -> JWT contains role, business_id, branch_ids, and any required sync claims
  -> PowerSync initializes with JWT
  -> Sync rules evaluate from JWT claims
  -> Initial sync downloads allowed buckets
  -> App becomes usable
  -> Incremental sync continues in background
  -> On token expiry, refresh and re-evaluate buckets
```

---

## 3. Data Model and Schema Design

### Critical SQLite and Postgres Rules

- Store all monetary values as `NUMERIC(12,2)` in Postgres.
- Store all money as decimal Peso numbers in client state.
- Never use integer-cent storage in this system.
- Never use floating-point money arithmetic without explicit rounding.
- Keep all primary keys as UUIDs.
- Every business-scoped table must carry `business_id`.
- Denormalize `business_id` onto child tables for RLS performance.

### Schema Snippet - Core Tables

```sql
CREATE TABLE businesses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id),
  name         TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE business_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  role         TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE TABLE branch_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID NOT NULL REFERENCES branches(id),
  business_id  UUID NOT NULL REFERENCES businesses(id),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, user_id)
);

CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  name             TEXT NOT NULL,
  category         TEXT NOT NULL,
  description      TEXT,
  is_archived      BOOLEAN NOT NULL DEFAULT false,
  version          INTEGER NOT NULL DEFAULT 1,
  price_peso       NUMERIC(12,2) NOT NULL CHECK (price_peso >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  last_modified_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE product_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  sku              TEXT,
  label            TEXT NOT NULL,
  price_peso       NUMERIC(12,2) NOT NULL CHECK (price_peso >= 0),
  is_archived      BOOLEAN NOT NULL DEFAULT false,
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id   UUID NOT NULL REFERENCES product_variants(id),
  branch_id            UUID NOT NULL REFERENCES branches(id),
  business_id          UUID NOT NULL REFERENCES businesses(id),
  quantity             INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_variant_id, branch_id)
);

CREATE TABLE inventory_adjustments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key    UUID NOT NULL UNIQUE,
  product_variant_id UUID NOT NULL REFERENCES product_variants(id),
  branch_id          UUID NOT NULL REFERENCES branches(id),
  business_id        UUID NOT NULL REFERENCES businesses(id),
  delta              INTEGER NOT NULL,
  reason             TEXT NOT NULL CHECK (reason IN (
                       'restock', 'damage', 'loss', 'correction',
                       'sale_decrement', 'refund_return', 'initial_count'
                     )),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID NOT NULL REFERENCES auth.users(id),
  source_device_id   TEXT NOT NULL
);

CREATE TABLE sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   UUID NOT NULL UNIQUE,
  branch_id         UUID NOT NULL REFERENCES branches(id),
  business_id       UUID NOT NULL REFERENCES businesses(id),
  reference_number  TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  discount_peso     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_peso >= 0),
  total_peso        NUMERIC(12,2) NOT NULL CHECK (total_peso >= 0),
  vat_peso          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (vat_peso >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  source_device_id  TEXT NOT NULL
);

CREATE TABLE sale_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id            UUID NOT NULL REFERENCES sales(id),
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id),
  business_id        UUID NOT NULL REFERENCES businesses(id),
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_peso    NUMERIC(12,2) NOT NULL CHECK (unit_price_peso >= 0),
  subtotal_peso      NUMERIC(12,2) NOT NULL CHECK (subtotal_peso >= 0)
);

CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID NOT NULL REFERENCES sales(id),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  method        TEXT NOT NULL CHECK (method IN ('cash', 'gcash', 'maya', 'card')),
  amount_peso   NUMERIC(12,2) NOT NULL CHECK (amount_peso > 0)
);

CREATE TABLE refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   UUID NOT NULL UNIQUE,
  original_sale_id  UUID NOT NULL REFERENCES sales(id),
  branch_id         UUID NOT NULL REFERENCES branches(id),
  business_id       UUID NOT NULL REFERENCES businesses(id),
  reason            TEXT NOT NULL,
  total_peso        NUMERIC(12,2) NOT NULL CHECK (total_peso > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  source_device_id  TEXT NOT NULL
);

CREATE TABLE refund_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id          UUID NOT NULL REFERENCES refunds(id),
  sale_item_id       UUID NOT NULL REFERENCES sale_items(id),
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id),
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_peso    NUMERIC(12,2) NOT NULL CHECK (unit_price_peso >= 0),
  subtotal_peso      NUMERIC(12,2) NOT NULL CHECK (subtotal_peso >= 0)
);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID REFERENCES branches(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  payload         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_device_id TEXT
);

CREATE TABLE device_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  business_id    UUID NOT NULL REFERENCES businesses(id),
  device_id      TEXT NOT NULL,
  device_name    TEXT,
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Outbox Table

The client must maintain a local outbox table in SQLite. This table is required for offline
replay, retry, and failure review.

```sql
CREATE TABLE outbox (
  id               TEXT PRIMARY KEY,
  idempotency_key   TEXT NOT NULL UNIQUE,
  mutation_type     TEXT NOT NULL,
  payload           TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'failed', 'dead_letter')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  next_retry_at     TEXT,
  source_device_id  TEXT NOT NULL
);
```

### Table Authority Reference

| Table                | Write Authority | RLS Required | Sync Target |
|---------------------|-----------------|-------------|-------------|
| businesses          | Server          | Yes         | Owner scope |
| branches            | Server          | Yes         | Owner scope |
| business_members    | Server          | Yes         | Owner scope |
| branch_members      | Server          | Yes         | Owner scope |
| products            | Server          | Yes         | Business scope |
| product_variants    | Server          | Yes         | Business scope |
| inventory_items     | Server          | Yes         | Branch scope |
| inventory_adjustments | Server       | Yes         | Branch scope |
| sales               | Server          | Yes         | Role-filtered |
| sale_items          | Server          | Yes         | Role-filtered |
| payments            | Server          | Yes         | Role-filtered |
| refunds             | Server          | Yes         | Role-filtered |
| refund_items        | Server          | Yes         | Role-filtered |
| audit_logs          | Server only     | Yes         | Owner scope |

### Test Definition Standard

Every checklist test must specify:

- setup
- action
- expected response
- expected database state
- expected row counts

A test is not considered passing unless all expected assertions are met. Error-code-only tests are
insufficient for high-risk flows such as stock changes, duplicate mutations, refunds, or concurrency
replay.

---

## 4. Mutation APIs and Transaction Design

Every mutation must be handled by a Supabase Edge Function that invokes a Postgres transaction.

### Required Mutation APIs

- `commit_sale`
- `create_refund`
- `apply_inventory_adjustment`
- `save_product`
- `archive_product`
- `create_business`
- `create_branch`
- `add_member`
- `remove_member`

### Wire Error Contract

Every Edge Function must return the same error envelope so client and server teams do not invent
incompatible shapes.

```json
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "One or more items are no longer available in the requested quantity.",
    "details": {
      "conflicts": [
        {
          "product_variant_id": "uuid",
          "branch_id": "uuid",
          "available_quantity": 2,
          "requested_quantity": 4
        }
      ]
    },
    "retryable": false,
    "request_id": "uuid",
    "field_errors": [
      {
        "field": "items[0].quantity",
        "code": "OUT_OF_STOCK",
        "message": "Requested quantity exceeds available stock."
      }
    ]
  }
}
```

Mandatory `error.code` values:

- `AUTH_EXPIRED`
- `REAUTH_REQUIRED`
- `UPGRADE_REQUIRED`
- `RLS_REJECTED`
- `INSUFFICIENT_STOCK`
- `IDEMPOTENCY_CONFLICT`
- `VERSION_CONFLICT`
- `VALIDATION_ERROR`
- `RATE_LIMITED`
- `SYNC_NOT_READY`
- `SERVER_ERROR`

Rules:

- `retryable` must be `false` for validation, authorization, and stock conflicts.
- `request_id` must be returned on every response for support tracing.
- `field_errors` is optional but required when a request fails validation on specific fields.
- The client must never infer server behavior from HTTP status alone.
- The error body is the contract; HTTP status is secondary.

### Commit Sale Transaction

The following must execute atomically in a single Postgres transaction:

```text
1. Check idempotency_key. If it exists, return the existing sale.
2. Validate caller role and branch scope.
3. Lock inventory rows with SELECT ... FOR UPDATE.
4. Validate every item has sufficient stock after decrement.
5. Compute authoritative totals, discount, VAT, and payment split.
6. INSERT sale with status completed and generate reference_number.
7. INSERT sale_items.
8. INSERT payments.
9. Apply inventory deltas for each item.
10. Insert audit log entries through triggers.
11. COMMIT.
```

Behavioral rules:

- If stock is insufficient, reject the full transaction.
- If the same `idempotency_key` is replayed, return the original sale response.
- If the caller retries after a timeout, the result must remain deterministic.
- If server totals differ from the client preview, the server value wins.
- If the caller is offline and later reconnects after a long delay, the sale commits using the
  catalog and price values captured at mutation creation time, unless the server rejects the item
  because the product or variant was never valid for the business or branch at commit time.

### Reference Number Generation

Reference numbers are generated server-side and must be human-readable, unique within the business,
and safe under concurrency.

- Format: `TXN-YYYYMMDD-NNNN`
- Sequence source: a transactional per-business daily counter in Postgres
- Scope: the sequence resets daily per business, not per branch
- Concurrency: two branches selling simultaneously must still receive unique numbers
- Ordering: sequence assignment happens inside the sale transaction

Example:

- first sale for business `abc` on `2026-06-01` -> `TXN-20260601-0001`
- second sale for the same business that day -> `TXN-20260601-0002`
- separate branches share the same business daily sequence

### Refund Transaction

```text
1. Check idempotency_key.
2. Validate original_sale_id exists and is completed.
3. Validate refund authorization:
   - owner may refund any sale in the business
   - employee may refund only their own sales
4. Validate refund items do not exceed original sold quantities.
5. INSERT refund.
6. INSERT refund_items.
7. Return stock using inventory deltas.
8. Update original sale status to refunded.
9. Trigger audit logging.
10. COMMIT.
```

### Inventory Adjustment Transaction

```text
1. Check idempotency_key.
2. Validate caller scope and reason.
3. Lock target inventory row.
4. Reject if delta would make quantity negative.
5. Apply delta.
6. Insert adjustment record.
7. Trigger audit logging.
8. COMMIT.
```

### Product Save Transaction

- Use `version` as optimistic locking for product and variant edits.
- Reject stale updates with a structured conflict response.
- Return authoritative current state so the client can reconcile.

### API Versioning

- All mutation endpoints must be versioned, for example `/v1/commit_sale`.
- The client must send its app version and supported API version range during auth/bootstrap.
- The server must reject unsupported clients with `UPGRADE_REQUIRED`.
- Define a minimum supported client version per release line.
- Keep a documented deprecation window before removing older versions.
- Versioned contracts must be backward compatible during the deprecation window unless the release is
  explicitly gated as incompatible.

---

## 5. Logic Flow Guards

### Guard 1 - Negative Stock Prevention

Where: Supabase Edge Function and Postgres function.

What it validates:

- Stock never drops below zero after a sale or adjustment.
- Conflicting writes are serialized with row locks.

Fallback:

- Reject with a structured error naming the out-of-stock variant(s).
- Roll back optimistic local state only for the failing mutation.

### Guard 2 - Duplicate Mutation Prevention

Where: UNIQUE constraint on `idempotency_key` plus edge function pre-check.

What it validates:

- The same sale, refund, or inventory adjustment cannot be committed twice.

Fallback:

- Return the original committed record.
- Mark the outbox entry as confirmed instead of failed.

### Guard 3 - Employee Refund Own Sales Only

Where: RLS and Edge Function authorization.

What it validates:

- Employees can refund only sales they created.

Fallback:

- Return 403 with a user-safe message.

### Guard 4 - Product Version Conflict

Where: Edge Function and conditional update.

What it validates:

- Client edits do not overwrite newer server edits silently.

Fallback:

- Return current server state with a conflict code.
- Require user review before resubmission.

### Guard 5 - Cross-Tenant Access

Where: Postgres RLS on every business-scoped table.

What it validates:

- No query or mutation can touch data outside the authenticated business.

Fallback:

- Return zero rows for reads.
- Return RLS violation for mutations.

### Guard 6 - Stale Local Mutations

Where: Outbox processor.

What it validates:

- Mutations older than the configured freshness window are reviewed instead of blindly replayed.

Fallback:

- Mark as `failed` or `dead_letter`.
- Surface a resolution UI.

Recommended policy:

- Any outbox item older than 30 minutes without confirmation is stale.
- Any item that fails repeatedly beyond the retry limit becomes `dead_letter`.

---

## 6. Security Controls

### Mandatory Postgres Controls

| Check                              | Must Exist In |
|------------------------------------|---------------|
| Tenant isolation                   | RLS           |
| Branch isolation                   | RLS           |
| Negative stock prevention          | Transaction + row lock |
| Duplicate mutation prevention      | UNIQUE constraint |
| Role-based mutation restrictions   | RLS + Edge Function |
| Refund own-sales-only restriction   | RLS + Edge Function |
| Audit log writes                   | Server trigger |
| Money precision                    | Schema + calculations |

### Required RLS Pattern

Apply the following pattern to every business-scoped table:

```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [table_name] FORCE ROW LEVEL SECURITY;

CREATE POLICY owner_access ON [table_name]
USING (
  business_id IN (
    SELECT business_id FROM business_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY employee_read ON [table_name]
FOR SELECT
USING (
  branch_id IN (
    SELECT branch_id FROM branch_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

Notes:

- Use table-specific write policies where appropriate.
- Employees should not receive branch data they do not need.
- Owners can read business-wide data within their business only.

### Audit Logging

Write audit logs via Postgres trigger on sensitive tables. Do not rely on Edge Functions to
write audit logs.

Audit events must include:

- actor identity
- business and branch
- entity type and entity id
- action performed
- timestamp
- payload snapshot
- source device id where available

Audit logs must be immutable and never deleted.

### Sensitive Data Handling

- Passwords are handled by Supabase Auth only.
- No free-text payment methods.
- No free-text role strings beyond the enumerated values.
- Device IDs are stable identifiers for traceability only, not authentication.
- Access tokens must be stored using secure device storage.

### Replay Protection

- Every mutation carries a UUID `idempotency_key`.
- Keys are stored permanently in the target record table.
- Replayed mutations return the original committed result.
- Keys are never reused.

---

## 7. Conflict and Consistency Rules

### Sale Commit Guarantees

Sales must be append-only after completion. The following invariants must hold:

- If a sale is completed, its sale lines and payments are immutable.
- If a sale is refunded, the original sale remains as the historical source of truth.
- Inventory decrements and refund increments must be applied atomically.
- Client previews are not authoritative.

### Concurrency Guarantees

The system must behave correctly under concurrent writes from multiple devices:

- Two users selling the last unit cannot both succeed.
- One sale must win, the other must fail cleanly.
- Replayed network retries must not duplicate records.
- Concurrent refunds against the same sale must be validated against the original quantities.
- Row-level locks must prevent lost updates on inventory.

### Reference Number Rules

- Each completed sale gets a unique `reference_number`.
- Reference numbers are generated server-side.
- Reference numbers must be unique within the business.
- The display format should be human-readable and sortable.

### VAT and Gross/Net Rules

- Store final prices paid in Peso values.
- VAT is derived on demand using the defined tax formula.
- If the UI shows gross and net values, server calculations take precedence.
- Rounding must be deterministic and consistent between client and server.

---

## 8. Operational Controls

This section is required for production readiness.

### Monitoring

The system must emit and monitor:

- sync lag
- pending outbox count
- dead-letter count
- mutation failure rate
- refund rejection rate
- stock conflict rate
- RLS violations
- audit log write failures

### Alerts

Alert on:

- repeated outbox failures
- dead-letter growth
- spikes in stock conflict errors
- sync backlog beyond acceptable threshold
- audit log trigger failures
- auth token refresh failures

### Backup and Restore

Production must have:

- automated backups for Postgres
- restore testing on a schedule
- defined recovery point objective and recovery time objective
- documented rollback procedure for failed deployments

The prompt must require that restore drills prove:

- sales history is intact
- refund history is intact
- audit logs are intact
- reference numbers remain unique
- RLS still works after restore

### Schema Migration Discipline

- Migrations must be additive first.
- Avoid destructive column removal in the same release as schema introduction.
- Changing synced schema requires PowerSync rule redeployment and client compatibility review.
- Never break older clients without a migration window.
- Every release must declare the minimum supported client version and the compatible API version range.

### Secrets and Session Handling

- Supabase anon keys and URL are environment-backed.
- No secret values are hardcoded in the client.
- Session storage must use secure device storage.
- Refresh and expiry behavior must be explicit.
- If the JWT expires while the outbox contains pending mutations, pause the outbox, trigger re-auth,
  and resume processing only after a fresh valid session is established.
- If a user is removed from a branch while offline, queued mutations must fail on reconnect with
  `RLS_REJECTED`, mark the outbox entry as failed, and show a user-safe message explaining that
  branch access was removed.
- Shared-device behavior must be explicit:
  - only one signed-in user may actively own the outbox at a time
  - when a second employee logs in, pause and seal the prior session, stop its outbox processing,
    and resume only after the new session has been established
  - any pending mutations that belong to the prior user remain visible in a handoff/review state

### Initial Sync Behavior

The app is not considered usable until a minimum viable sync state is available.

Minimum viable state:

- authenticated active business context
- active branch context
- product catalog for the active business
- current inventory for the active branch
- role and permission claims resolved

UI behavior before minimum viable state:

- show a blocking sync/loading screen
- allow no checkout or inventory-affecting writes
- allow read-only status text and progress indication only

UI behavior while partially synced:

- product lists may render as data arrives
- checkout remains blocked until inventory is present for the active branch
- attempting a sale before minimum viable state returns `SYNC_NOT_READY`

If syncing stalls or fails during initial bootstrap, the user must see a clear retry state rather than
an ambiguous blank or partially functional screen.

### Performance Budgets

Budget Android devices must remain usable:

- fast startup
- responsive local filtering
- no network dependency for list rendering
- bounded memory usage for sale and inventory views
- stable behavior under long offline sessions

---

## 9. Failure Modes

The prompt must explicitly define what happens when things go wrong.

### Duplicate Submissions

- Same `idempotency_key` must never create duplicate business records.
- Return the original committed result.

### Offline Retries

- Failed network attempts must stay queued.
- Retries should use backoff.
- Permanent failures must become reviewable.

### Stale Queued Mutations

- Older queued writes must be surfaced to the user.
- The user may retry, discard, or reconcile them.
- The prompt should treat 30 minutes as the default freshness threshold for review, but long offline
  durations are allowed if the mutation still validates at commit time.
- A sale created offline remains valid at the captured price and catalog state at mutation creation
  time, subject to commit-time authorization and inventory rules.
- If a product or variant was archived after the sale was created but before reconnect, the sale
  should be rejected only if the business rule says archived items are not sellable at commit time;
  otherwise the server must commit using the captured line-item state.

### Partial Sync Recovery

- If sync resumes after a long disconnect, the app must reconcile pending writes before claiming synced state.
- Optimistic records must be visually distinct until confirmed.

### Server Rejection Rollback

- If the server rejects a mutation, the local optimistic state must roll back or be marked failed.
- The UI must show a user-safe explanation.

### Dead-Letter Handling

- A mutation that exceeds retry limits or fails a hard validation becomes `dead_letter`.
- Dead-letter records must remain visible for operational review.
- Dead-letter items must not disappear silently.

### Retry and Re-auth Flow

- If a mutation fails due to token expiry, pause the outbox and prompt re-authentication.
- If re-auth succeeds, resume with the same ordering and idempotency keys.
- If re-auth fails, keep pending outbox items intact and surface a blocked sync state.
- If a mutation fails due to RLS after reconnect, do not retry automatically without a new valid
  session.

---

## 10. Best Practices

### Offline-First UX Patterns

- Show a persistent sync status indicator: synced, pending, offline, failed.
- Distinguish pending records from confirmed records.
- Never block the UI waiting for network confirmation.
- Surface failed mutations prominently.
- On reconnect, show a brief syncing indicator with counts.

### Schema Design Patterns

- Every business-scoped table has `business_id`.
- Money uses Peso decimals, not cents.
- UUIDs are used for all primary keys.
- Child tables denormalize `business_id` for RLS performance.
- Financial records are append-only.
- Non-financial mutable records use `version` for optimistic locking.

### Sync-Safe Mutation Design

- Every mutation carries `idempotency_key`.
- Never send absolute stock counts from the client.
- Use deltas for stock adjustments.
- Client can preview totals, but server computes authoritative totals.
- Process outbox entries in creation order unless a dependency requires a different strict order.

### Auditability

- Audit logs are written by Postgres triggers.
- Audit logs include actor, branch, timestamp, and payload snapshot.
- Audit logs are owner-visible only.
- Audit logs must be queryable without bypassing RLS.

---

## 11. Anti-Patterns to Avoid

| Anti-Pattern                                   | Why It Fails |
|-----------------------------------------------|--------------|
| Trusting client for stock validation          | Offline clients are stale and concurrent writes will conflict |
| Using cents-based storage in this system      | The system explicitly standardizes on Peso decimals |
| Allowing client to write absolute stock count | Concurrent offline changes can overwrite each other |
| Skipping idempotency keys                     | Retries create duplicate sales and refunds |
| Writing audit logs only in app code           | Bugs can silently skip audit records |
| Syncing all branches to employee devices      | Privacy and least-privilege violations |
| Using only updated_at for conflict detection  | Clock skew causes silent overwrites |
| Letting local SQLite be the source of truth   | Local state is cache, not authority |
| Allowing post-payment void as a separate flow | Refund must handle post-commit reversal |
| Relying on UI role checks for security        | UI can be bypassed; RLS must enforce rules |
| Silent mutation failure                       | Operators lose trust and data becomes inconsistent |
| Hidden dead-letter records                    | Operations cannot recover failures |

---

## 12. Implementation Checklist - Vertical Slices

Complete each slice fully before starting the next. Do not move to the next slice until all
tests in the current slice pass.

```text
SLICE 0 - FOUNDATION
  - Create Supabase project and basic auth flow
  - Create businesses, branches, business_members, branch_members
  - Enable RLS on all tables with tenant isolation policies
  - Verify no cross-tenant data leakage with test accounts
  - Configure Supabase Auth with required JWT claims
  - Connect PowerSync project to Supabase
  - Install PowerSync client SDK in mobile app
  - Confirm app authenticates and local SQLite is created
  - Create local outbox table
  - Implement outbox processor with retry, backoff, and dead-letter handling
  - Implement sync status indicator: offline / pending / failed / synced

SLICE 1 - PRODUCTS
  - Create products and product_variants
  - Add version field and optimistic lock to save_product
  - Enforce business-scoped sync rules
  - Query products and variants from SQLite
  - Add product list, add, edit, and archive flows
  - Test version conflict between two editors
  - Test archived products excluded from employee sync
  - Test offline edits queued and applied on reconnect

SLICE 2 - INVENTORY
  - Create inventory_items and inventory_adjustments
  - Create apply_inventory_delta transaction with negative-stock guard
  - Enforce allowed reason types and branch scope
  - Sync inventory by branch scope
  - Show inventory list and low-stock indicators
  - Test negative stock rejection under concurrency:
    - Setup: product_variant with quantity = 1 in branch A
    - Action: two separate devices submit apply_inventory_adjustment with delta = -1 and different
      idempotency_keys at the same time
    - Expected: exactly one succeeds, one fails with `INSUFFICIENT_STOCK`
    - Expected: final quantity = 0, not -1
    - Expected: exactly one inventory_adjustment record exists for the successful key
  - Test idempotent adjustment replay:
    - Setup: submit apply_inventory_adjustment with idempotency_key K
    - Action: submit the identical request again with the same idempotency_key K
    - Expected: second response is identical to the first response
    - Expected: exactly one inventory_adjustment record exists for key K
    - Expected: quantity changed by delta exactly once
  - Test two employees adjusting the same item offline:
    - Setup: both devices queue a valid adjustment against the same inventory row
    - Action: reconnect both devices and process the outbox
    - Expected: final quantity matches the serialized sum of accepted deltas
    - Expected: no duplicate records and no negative quantity

SLICE 3 - SALES
  - Create sales, sale_items, payments
  - Create commit_sale transaction
  - Enforce employee sees own sales only, owner sees business-wide sales
  - Sync sales by role-aware rules
  - Build sale creation flow with split payments
  - Show pending sale indicators from outbox status
  - Test insufficient stock rejection:
    - Setup: one branch inventory row with quantity = 1, cart contains quantity = 2
    - Action: submit commit_sale
    - Expected: response code is `INSUFFICIENT_STOCK`
    - Expected: sale is not completed
    - Expected: inventory quantity remains unchanged
    - Expected: no sale_items or payments are committed for the rejected transaction
  - Test duplicate submission returns original sale:
    - Setup: submit commit_sale with idempotency_key K
    - Action: submit the exact same payload with the same idempotency_key K again
    - Expected: second response matches the first sale id and reference_number
    - Expected: exactly one completed sale exists for key K
    - Expected: inventory decremented exactly once
  - Test split payment persistence:
    - Setup: sale total = 500.00, payments = 300.00 cash + 200.00 card
    - Action: submit commit_sale
    - Expected: sale completes successfully
    - Expected: two payment rows exist for the sale
    - Expected: summed payments equal the sale total exactly
  - Test offline sale queued and committed on reconnect:
    - Setup: device offline with valid cart and sufficient stock known locally
    - Action: create sale, reconnect, and process outbox
    - Expected: pending state becomes confirmed
    - Expected: the authoritative sale is created exactly once
    - Expected: inventory is decremented exactly once

SLICE 4 - REFUNDS
  - Create refunds and refund_items
  - Create create_refund transaction
  - Enforce employee refund policy for own sales only
  - Sync refunds by role
  - Build refund flow from sale detail
  - Test employee refund of own sale
  - Test employee refund of another employee's sale is rejected
  - Test owner refund of any sale
  - Test already-refunded sale rejection

SLICE 5 - AUDIT AND OPERATIONS
  - Create audit_logs
  - Add triggers for sales, refunds, inventory_adjustments, products
  - Enforce owner-only audit log visibility
  - Add stale outbox detection and review UI
  - Add failed mutation recovery UI
  - Add monitoring and alerting hooks
  - Validate backup and restore assumptions
  - Verify release gate tests pass
```

---

## 13. PowerSync SDK Constraints

The following PowerSync-specific behaviors are mandatory.

### Constraint 1 - SQLite Type Mapping

| Postgres Type       | SQLite Type    | Impact |
|---------------------|----------------|--------|
| UUID                | TEXT           | Compare as strings |
| BOOLEAN             | INTEGER        | Use 0/1 semantics |
| NUMERIC(12,2)       | TEXT           | Preserve Peso precision exactly as canonical decimal strings |
| TIMESTAMPTZ         | TEXT           | Parse explicitly |
| JSONB               | TEXT           | Parse with JSON.parse |

Money rule:

- Do not rely on SQLite `REAL` for any monetary field.
- Persist local monetary values as canonical decimal strings with exactly two fractional digits.
- Convert to a decimal-safe helper before any arithmetic.

### Constraint 2 - Sync Rules Are Static

Sync rules are deployed at the PowerSync project level and are not rewritten per device at runtime.
The scope of what syncs to a device is determined by JWT claims at authentication time.

### Constraint 3 - No Built-In Mutation Queue

PowerSync syncs data from Supabase to the client. It does not manage the write path.
The outbox table and outbox processor are mandatory client-side implementations.

### Constraint 4 - Schema Changes Require Sync Rule Redeployment

Adding a column to a synced table requires:

1. Postgres migration
2. Sync rule update and redeployment
3. Client update for the new shape

Migrations must be additive. Never rename or remove synced columns in a single release.

### Constraint 5 - Optimistic State Must Be Visually Distinct

Local SQLite contains both confirmed and optimistic records. The UI must distinguish them.
Use outbox status to drive visual state.

---

## 14. Production Readiness Gate

The system is only considered ready for professional industry use if all of the following are true:

- all security-critical rules are enforced in Postgres or Edge Functions, not just the client
- all mutations are idempotent
- all money calculations use Peso decimals consistently
- no client can cause negative stock through a race condition
- refunds are restricted correctly under concurrent access
- tenant and branch isolation are verified with tests
- audit logs are complete and immutable
- outbox replay, dead-letter, and recovery flows are implemented
- failed mutations are visible and actionable
- backup and restore are tested
- schema changes have a compatibility plan
- low-end device performance remains acceptable
- operational metrics and alerts exist
- release gate tests pass before production rollout
- error responses follow a single documented envelope
- token-expiry, branch-removal, and shared-device handoff behavior are defined and tested
- initial sync blocks checkout until the minimum viable state is reached
- reference number generation is collision-free under concurrency
- API versioning and client deprecation windows are defined
- long offline operation is explicitly supported by policy

If any item above is missing, the system is not production-ready.
