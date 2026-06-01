# Offline-First PowerSync + Supabase Architecture
# Cellphone Accessories POS — Implementation Prompt for AI CLI Agent

---

## Agent Instructions

You are a senior mobile/backend architect specializing in offline-first systems, distributed data,
and secure multi-tenant POS applications. Produce an implementation-ready architecture document.
Do not produce theoretical overviews. Every section must contain actionable decisions, concrete
schema, real pseudo-code, and explicit reasoning. Where a choice must be made, make it and defend it.

---

## System Context

- **Domain:** Point-of-sale and inventory management for cellphone accessories retail
  (mobile phones, chargers, cases, cables, screen protectors, and accessories with variants
  such as color and device-model compatibility)
- **Connectivity:** Offline-first. The app must be fully functional with zero internet connectivity.
  Sync happens opportunistically when connectivity is available.
- **Scale:** Multiple independent businesses (tenants). Each business has one or more branches.
  Each branch has one or more employees.
- **Devices:** Android and iOS mobile devices. Budget Android devices must be supported.
  Assume 2–3 GB RAM floor.
- **Roles:** Exactly two roles — `owner` and `employee`. No manager role exists.
- **No hardware integration:** No receipt printers, no cash drawers, no barcode scanners.
  The app is the only interface.
- **Payments:** Cash, GCash, Maya, and card. Split payment (multiple methods per sale) must
  be supported.
- **Tax:** Philippines VAT-inclusive pricing. Store final price paid. Derive VAT breakdown
  (price / 1.12 × 0.12) on demand. No real-time tax engine required.
- **Receipt:** No print flow. Generate a `reference_number` (e.g. `TXN-20260601-0042`) per sale.
  Customer photographs screen if needed.

---

## Role Capability Matrix

This matrix is authoritative. All RLS policies, API guards, sync rules, and UI permission
checks must derive from it. Do not invent additional roles or permissions.

| Action                              | Owner | Employee |
|-------------------------------------|-------|----------|
| Process a sale                      | ✓     | ✓        |
| Cancel a sale (pre-payment)         | ✓     | ✓        |
| Apply discounts                     | ✓     | ✓        |
| Refund a completed sale             | ✓     | ✓ (own sales only) |
| Add / edit / archive products       | ✓     | ✓        |
| Adjust inventory manually           | ✓     | ✓        |
| View inventory levels               | ✓     | ✓        |
| View their own sales records        | ✓     | ✓        |
| View all branch sales records       | ✓     | ✗        |
| View all employees' sales records   | ✓     | ✗        |
| View branch-level reports           | ✓     | ✗        |
| Add / remove employees              | ✓     | ✗        |
| Create / manage branches            | ✓     | ✗        |
| View audit logs                     | ✓     | ✗        |
| Export data                         | ✓     | ✗        |

**Critical guard:** Employees can refund only their own sales. This is enforced via
`created_by = auth.uid()` in the RLS refund policy — not via a separate role check.

**Void vs Refund:** This system does not implement void as a separate concept.
- **Cancel** (pre-payment): Sale record is deleted or status set to `cancelled` before any
  payment is recorded. No stock was decremented. No counter-transaction needed.
- **Refund** (post-payment): A new counter-transaction is created referencing the original sale.
  Stock is returned. The original sale record is immutable.

---

## Tenancy Model

Use **shared schema with `business_id` row-level isolation**. Do not use schema-per-tenant
or database-per-tenant. Rationale: SaaS with many small-to-medium businesses. Migration
complexity and connection pooling costs of schema-per-tenant are not justified.

Hierarchy:

```
business
  └── branch
        └── branch_members (user ↔ branch ↔ role)
```

- An owner belongs to a business. They have cross-branch visibility within that business only.
- An employee belongs to one or more branches within a business.
- No user ever accesses data outside their business. Enforced at Postgres RLS level.
- Branch isolation is enforced for employees. Owners bypass branch isolation within their business.

---

## 1. Executive Summary

This system uses **PowerSync as the offline sync and local cache layer** and **Supabase as the
secure source of truth**. The client app reads exclusively from a local SQLite database managed
by PowerSync. All writes follow a two-phase pattern: optimistic local write for immediate UI
feedback, followed by an API call to Supabase for authoritative validation and commit.

Core principles:

1. **Local reads are always fast.** The app never blocks on network for UI rendering.
2. **Writes are always validated server-side.** The client never has final authority over
   stock levels, sale commits, or financial records.
3. **All mutations are idempotent.** Every write carries a client-generated UUID
   (`idempotency_key`) so retries are safe.
4. **Conflict resolution is per-entity, not generic.** Sales are append-only. Stock uses
   server-authoritative delta application. Products use optimistic locking with version fields.
5. **The outbox is the source of truth for pending writes.** The client maintains a local
   outbox table in SQLite. The outbox is processed in order on reconnect.
6. **Audit logs are server-side only.** Clients never write directly to audit logs.

---

## 2. System Architecture

### Layers

```
┌─────────────────────────────────────────────┐
│              CLIENT APP LAYER                │
│  Flutter/React Native UI                     │
│  Reads from local SQLite only                │
│  Writes to outbox + optimistic local state   │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│          LOCAL PERSISTENCE LAYER             │
│  SQLite (managed by PowerSync SDK)           │
│  Tables: all synced entities + outbox        │
│  Outbox: pending mutations queue             │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│            SYNC ENGINE LAYER                 │
│  PowerSync client SDK                        │
│  Receives replication stream from PowerSync  │
│  Applies server data to local SQLite         │
│  Does NOT manage write path                  │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│           API AND AUTH LAYER                 │
│  Supabase Auth (JWT with role claim)         │
│  Supabase Edge Functions (mutation APIs)     │
│  All business logic validated here           │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│         SUPABASE DATABASE LAYER              │
│  Postgres with RLS enabled on all tables     │
│  Source of truth for all data                │
│  Postgres functions for atomic operations    │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│     BACKGROUND RECONCILIATION LAYER          │
│  PowerSync replication stream → local SQLite │
│  Outbox processor: retry failed mutations    │
│  Stale data detector: flag old local state   │
│  Conflict handler: version mismatch UI       │
└─────────────────────────────────────────────┘
```

### Write Path (Online)

```
1. User action in UI
2. Write optimistic record to local SQLite (status: 'pending')
3. Write mutation to outbox table (status: 'pending')
4. UI immediately reflects optimistic state
5. Outbox processor picks up mutation
6. API call to Supabase Edge Function with idempotency_key
7. Edge Function validates, commits atomically in Postgres
8. Edge Function returns success or structured error
9. On success: outbox entry marked 'confirmed'
10. PowerSync replication stream delivers server state to local SQLite
11. Local optimistic record replaced by authoritative server record
12. UI reflects confirmed state (may differ from optimistic if server adjusted)
```

### Write Path (Offline)

```
1. User action in UI
2. Write optimistic record to local SQLite (status: 'pending')
3. Write mutation to outbox table (status: 'pending')
4. UI immediately reflects optimistic state
5. Outbox processor detects no connectivity — pauses
6. On reconnect: outbox processor resumes
7. Process outbox entries in created_at order
8. Each entry goes through steps 6–12 of online write path
9. If server rejects (e.g. stock conflict): mark outbox entry 'failed',
   roll back local optimistic record, surface conflict UI
```

### Read Path

All reads are local SQLite queries. PowerSync keeps SQLite current via replication.
The app never queries Supabase directly for reads.

### Sync Lifecycle

```
App launch
  → Authenticate with Supabase Auth
  → JWT contains: user_id, business_id, branch_id[], role
  → PowerSync client initialises with JWT
  → PowerSync evaluates sync rules using JWT claims
  → Initial sync: downloads all data in user's sync buckets
  → App becomes usable
  → Incremental sync: continuous stream of changes
  → On token expiry: re-authenticate, PowerSync re-evaluates buckets
```

---

## 3. Data Model and Schema Design

### Critical SQLite Constraint

PowerSync uses SQLite locally. Store all monetary values as **integer cents** to avoid
floating-point errors. ₱149.00 = `14900`. Never store prices as DECIMAL or FLOAT.

### Schema Snippet — All Tables

```sql
-- ============================================================
-- TENANT AND MEMBERSHIP
-- ============================================================

CREATE TABLE businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE business_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  role          TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE TABLE branch_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  business_id   UUID NOT NULL REFERENCES businesses(id), -- denormalized for RLS performance
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, user_id)
);

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL, -- 'phone', 'charger', 'case', 'cable', 'accessory'
  description     TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  version         INTEGER NOT NULL DEFAULT 1, -- optimistic lock
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  last_modified_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE product_variants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES products(id),
  business_id           UUID NOT NULL REFERENCES businesses(id), -- denormalized for RLS
  sku                   TEXT,
  label                 TEXT NOT NULL, -- e.g. "Black / iPhone 15", "65W / White"
  price_cents           INTEGER NOT NULL CHECK (price_cents >= 0),
  is_archived           BOOLEAN NOT NULL DEFAULT false,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_by      UUID NOT NULL REFERENCES auth.users(id)
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  business_id         UUID NOT NULL REFERENCES businesses(id), -- denormalized for RLS
  quantity            INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_variant_id, branch_id)
);

CREATE TABLE inventory_adjustments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key     UUID NOT NULL UNIQUE, -- client-generated, prevents duplicates
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  business_id         UUID NOT NULL REFERENCES businesses(id),
  delta               INTEGER NOT NULL, -- positive = add stock, negative = remove stock
  reason              TEXT NOT NULL CHECK (reason IN (
                        'restock', 'damage', 'loss', 'correction',
                        'sale_decrement', 'refund_return', 'initial_count'
                      )),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  source_device_id    TEXT NOT NULL
);

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   UUID NOT NULL UNIQUE,
  branch_id         UUID NOT NULL REFERENCES branches(id),
  business_id       UUID NOT NULL REFERENCES businesses(id),
  reference_number  TEXT NOT NULL UNIQUE, -- e.g. TXN-20260601-0042
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  discount_cents    INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents       INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  source_device_id  TEXT NOT NULL
);

CREATE TABLE sale_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id             UUID NOT NULL REFERENCES sales(id),
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id),
  business_id         UUID NOT NULL REFERENCES businesses(id),
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents    INTEGER NOT NULL CHECK (unit_price_cents >= 0), -- price at time of sale
  subtotal_cents      INTEGER NOT NULL CHECK (subtotal_cents >= 0)
);

CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID NOT NULL REFERENCES sales(id),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  method        TEXT NOT NULL CHECK (method IN ('cash', 'gcash', 'maya', 'card')),
  amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REFUNDS (append-only, references original sale)
-- ============================================================

CREATE TABLE refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   UUID NOT NULL UNIQUE,
  original_sale_id  UUID NOT NULL REFERENCES sales(id),
  branch_id         UUID NOT NULL REFERENCES branches(id),
  business_id       UUID NOT NULL REFERENCES businesses(id),
  reason            TEXT NOT NULL,
  total_cents       INTEGER NOT NULL CHECK (total_cents > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  source_device_id  TEXT NOT NULL
);

CREATE TABLE refund_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id           UUID NOT NULL REFERENCES refunds(id),
  sale_item_id        UUID NOT NULL REFERENCES sale_items(id),
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id),
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents    INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  subtotal_cents      INTEGER NOT NULL CHECK (subtotal_cents >= 0)
);

-- ============================================================
-- AUDIT LOGS (server-side only, never written by client)
-- ============================================================

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  branch_id     UUID REFERENCES branches(id),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  action        TEXT NOT NULL, -- 'sale_created', 'refund_created', 'inventory_adjusted', etc.
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  payload       JSONB NOT NULL, -- full snapshot of what changed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_device_id TEXT
);

-- ============================================================
-- DEVICE/SESSION TRACKING
-- ============================================================

CREATE TABLE device_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  device_id       TEXT NOT NULL, -- client-generated stable device identifier
  device_name     TEXT,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table Authority Reference

| Table               | Authoritative Fields              | Derived Fields         | Cacheable Locally |
|---------------------|-----------------------------------|------------------------|-------------------|
| businesses          | all                               | —                      | yes               |
| branches            | all                               | —                      | yes               |
| business_members    | all                               | —                      | yes               |
| branch_members      | all                               | —                      | yes               |
| products            | all except derived below          | —                      | yes               |
| product_variants    | all                               | —                      | yes               |
| inventory_items     | quantity (server applies deltas)  | —                      | yes (optimistic)  |
| inventory_adjustments | all                             | —                      | yes               |
| sales               | all                               | reference_number (generated) | yes        |
| sale_items          | all                               | subtotal_cents         | yes               |
| payments            | all                               | —                      | yes               |
| refunds             | all                               | —                      | yes               |
| refund_items        | all                               | subtotal_cents         | yes               |
| audit_logs          | all                               | —                      | owner only        |
| device_sessions     | all                               | —                      | no                |

---

## 4. Sync Strategy

### Sync Rules — PowerSync YAML

```yaml
bucket_definitions:

  # Owner bucket: all branches in their business
  owner_business_data:
    parameters: >
      SELECT bm.business_id
      FROM business_members bm
      WHERE bm.user_id = token_parameters.user_id
        AND bm.role = 'owner'
    data:
      - SELECT * FROM products WHERE business_id = bucket.business_id AND is_archived = false
      - SELECT * FROM product_variants WHERE business_id = bucket.business_id AND is_archived = false
      - SELECT * FROM inventory_items WHERE business_id = bucket.business_id
      - SELECT * FROM inventory_adjustments WHERE business_id = bucket.business_id
      - SELECT * FROM sales WHERE business_id = bucket.business_id
      - SELECT * FROM sale_items WHERE business_id = bucket.business_id
      - SELECT * FROM payments WHERE business_id = bucket.business_id
      - SELECT * FROM refunds WHERE business_id = bucket.business_id
      - SELECT * FROM refund_items WHERE business_id = bucket.business_id
      - SELECT * FROM branches WHERE business_id = bucket.business_id
      - SELECT * FROM branch_members WHERE business_id = bucket.business_id
      - SELECT * FROM audit_logs WHERE business_id = bucket.business_id

  # Employee bucket: only their assigned branch
  employee_branch_data:
    parameters: >
      SELECT bm.branch_id, bm.business_id
      FROM branch_members bm
      WHERE bm.user_id = token_parameters.user_id
        AND bm.is_active = true
    data:
      - SELECT * FROM products
          WHERE business_id = bucket.business_id AND is_archived = false
      - SELECT * FROM product_variants
          WHERE business_id = bucket.business_id AND is_archived = false
      - SELECT * FROM inventory_items
          WHERE branch_id = bucket.branch_id
      - SELECT * FROM inventory_adjustments
          WHERE branch_id = bucket.branch_id
            AND created_by = token_parameters.user_id
      - SELECT * FROM sales
          WHERE branch_id = bucket.branch_id
            AND created_by = token_parameters.user_id
      - SELECT * FROM sale_items
          WHERE sale_id IN (
            SELECT id FROM sales
            WHERE branch_id = bucket.branch_id
              AND created_by = token_parameters.user_id
          )
      - SELECT * FROM payments
          WHERE sale_id IN (
            SELECT id FROM sales
            WHERE branch_id = bucket.branch_id
              AND created_by = token_parameters.user_id
          )
      - SELECT * FROM refunds
          WHERE branch_id = bucket.branch_id
            AND created_by = token_parameters.user_id
```

### Conflict Resolution — Per Entity

| Entity                | Strategy                        | Rationale                                                      |
|-----------------------|---------------------------------|----------------------------------------------------------------|
| sales                 | Append-only, immutable after commit | Ledger entry. Refund creates counter-record.             |
| sale_items            | Append-only                     | Immutable after sale commit.                                   |
| payments              | Append-only                     | Financial fact.                                                |
| refunds               | Append-only                     | Counter-transaction, immutable after creation.                 |
| inventory_items       | Server-authoritative delta      | Server applies deltas in order; rejects negative-stock.        |
| inventory_adjustments | Append-only delta records       | Each record is a delta (+/-). Server applies and validates.    |
| products              | Optimistic lock (version field) | Last write wins only if version matches server version.        |
| product_variants      | Optimistic lock (version field) | Same as products.                                              |
| audit_logs            | Append-only, server-only        | Clients never write directly.                                  |

### Idempotency Pattern

Every mutation that reaches the server carries a `client_idempotency_key` (UUID generated
on the client at mutation creation time). The server checks this key before processing:

```sql
-- On commit_sale edge function entry:
IF EXISTS (SELECT 1 FROM sales WHERE idempotency_key = p_idempotency_key) THEN
  -- Return the existing sale record — do not process again
  RETURN (SELECT row_to_json(s) FROM sales s WHERE idempotency_key = p_idempotency_key);
END IF;
```

### Outbox Table (Local SQLite — Client Managed)

```sql
-- This table lives in local SQLite only. It is NOT synced to Supabase.
CREATE TABLE outbox (
  id                TEXT PRIMARY KEY,   -- client UUID
  operation         TEXT NOT NULL,      -- 'commit_sale', 'adjust_inventory', 'save_product', 'create_refund'
  payload           TEXT NOT NULL,      -- JSON blob
  idempotency_key   TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'pending',
                                        -- 'pending', 'submitted', 'confirmed', 'failed'
  error_message     TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,   -- Unix timestamp
  submitted_at      INTEGER,
  confirmed_at      INTEGER
);
```

### Outbox Processor Logic

```javascript
async function processOutbox() {
  const pending = await localDb.query(
    `SELECT * FROM outbox WHERE status = 'pending' OR status = 'failed' AND retry_count < 5
     ORDER BY created_at ASC`
  );

  for (const entry of pending) {
    try {
      await localDb.execute(
        `UPDATE outbox SET status = 'submitted', submitted_at = ? WHERE id = ?`,
        [Date.now(), entry.id]
      );

      const response = await callEdgeFunction(entry.operation, JSON.parse(entry.payload));

      await localDb.execute(
        `UPDATE outbox SET status = 'confirmed', confirmed_at = ? WHERE id = ?`,
        [Date.now(), entry.id]
      );
    } catch (error) {
      const newRetryCount = entry.retry_count + 1;
      const status = newRetryCount >= 5 ? 'failed' : 'pending';

      await localDb.execute(
        `UPDATE outbox SET status = ?, retry_count = ?, error_message = ? WHERE id = ?`,
        [status, newRetryCount, error.message, entry.id]
      );

      if (status === 'failed') {
        // Surface to UI: this mutation permanently failed
        notifyUserOfFailedMutation(entry);
      }
    }
  }
}
```

### Retry Behavior

- Retry with exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 retries per mutation
- After 5 failures: status = 'failed', UI notified, manual resolution required
- Network errors: retry. Business logic rejections (e.g. negative stock): do not retry,
  mark failed immediately, roll back optimistic local record

---

## 5. Logic Flow Guards

### Guard 1 — Negative Stock Prevention

```
Where: Supabase Edge Function (commit_sale) and Postgres function (apply_inventory_delta)
What it validates: After decrementing, quantity >= 0 for every line item in the sale
What it blocks: Any sale where stock would go below zero for any variant
Fallback: Return structured error identifying which variants are out of stock.
          Client rolls back optimistic sale record. UI shows "Insufficient stock: [variant names]"
```

```sql
CREATE OR REPLACE FUNCTION apply_inventory_delta(
  p_product_variant_id UUID,
  p_branch_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_idempotency_key UUID,
  p_created_by UUID,
  p_source_device_id TEXT
) RETURNS void AS $$
DECLARE
  v_current_qty INTEGER;
BEGIN
  -- Lock the row to prevent concurrent race
  SELECT quantity INTO v_current_qty
  FROM inventory_items
  WHERE product_variant_id = p_product_variant_id AND branch_id = p_branch_id
  FOR UPDATE;

  IF v_current_qty + p_delta < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_STOCK: variant % would reach %',
      p_product_variant_id, v_current_qty + p_delta;
  END IF;

  UPDATE inventory_items
  SET quantity = quantity + p_delta, updated_at = now()
  WHERE product_variant_id = p_product_variant_id AND branch_id = p_branch_id;

  INSERT INTO inventory_adjustments
    (idempotency_key, product_variant_id, branch_id, business_id, delta, reason, created_by, source_device_id)
  SELECT p_idempotency_key, p_product_variant_id, p_branch_id, i.business_id,
         p_delta, p_reason, p_created_by, p_source_device_id
  FROM inventory_items i
  WHERE i.product_variant_id = p_product_variant_id AND i.branch_id = p_branch_id;
END;
$$ LANGUAGE plpgsql;
```

### Guard 2 — Duplicate Sale Prevention

```
Where: Supabase Postgres UNIQUE constraint on sales.idempotency_key
       + Edge Function pre-check (return existing record on duplicate key)
What it validates: Same sale not committed twice (e.g. double-tap, network retry)
What it blocks: Second insert with same idempotency_key
Fallback: Return the original sale record as if it succeeded. Client deduplicates by key.
```

### Guard 3 — Employee Refund Own Sales Only

```
Where: RLS policy on refunds table + Edge Function authorization check
What it validates: created_by of the original sale matches auth.uid() for employee role
What it blocks: Employee attempting to refund another employee's sale
Fallback: 403 error returned. UI shows "You can only refund your own sales."
```

```sql
CREATE POLICY refund_insert_policy ON refunds FOR INSERT
USING (
  -- Owners can refund any sale in their business
  EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.business_id = refunds.business_id
      AND bm.role = 'owner'
  )
  OR
  -- Employees can only refund their own sales
  EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = refunds.original_sale_id
      AND s.created_by = auth.uid()
  )
);
```

### Guard 4 — Product Version Conflict

```
Where: Edge Function (save_product) + Postgres conditional update
What it validates: Client's known version matches current server version
What it blocks: Overwriting a product that was edited by someone else since last sync
Fallback: Return structured conflict error with current server state.
          UI shows conflict modal: "This product was updated by [user]. Review changes before saving."
```

```javascript
// Edge Function: save_product
async function saveProduct(payload) {
  const { id, version, ...fields } = payload;

  const { data, error } = await supabase
    .from('products')
    .update({ ...fields, version: version + 1, updated_at: new Date() })
    .eq('id', id)
    .eq('version', version) // optimistic lock
    .select();

  if (!data || data.length === 0) {
    // Version mismatch — fetch current state and return conflict
    const current = await supabase.from('products').select('*').eq('id', id).single();
    return { error: 'VERSION_CONFLICT', current: current.data };
  }

  return { data: data[0] };
}
```

### Guard 5 — Cross-Tenant Access

```
Where: Postgres RLS on every table (non-negotiable, not client-enforced)
What it validates: business_id in the row matches the business_id of the authenticated user
What it blocks: Any query or mutation touching another business's data
Fallback: Query returns zero rows. Mutation returns RLS violation error.
          This should never reach the UI — it indicates a bug or attack.
```

### Guard 6 — Stale Local Data After Reconnect

```
Where: Client outbox processor, before processing queued mutations
What it validates: If a queued mutation is older than 30 minutes, flag it for review
What it blocks: Silent application of very stale offline mutations
Fallback: Surface stale mutation list to user. Allow user to confirm or discard each.
          Proceed with confirmed mutations. Discard cancelled ones from outbox.
```

---

## 6. Security Controls

### Row-Level Security Policies

Apply the following pattern to every business-scoped table:

```sql
-- Enable RLS (do this for every table)
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [table_name] FORCE ROW LEVEL SECURITY;

-- Owner: full access within their business
CREATE POLICY owner_access ON [table_name]
USING (
  business_id IN (
    SELECT business_id FROM business_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Employee: read access within their assigned branch
CREATE POLICY employee_read ON [table_name]
FOR SELECT
USING (
  branch_id IN (
    SELECT branch_id FROM branch_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

### Which Checks Are Mandatory at Postgres Level (Never Client-Only)

| Check                              | Must be in Postgres |
|------------------------------------|---------------------|
| Tenant isolation (business_id)     | ✓ RLS               |
| Branch isolation (branch_id)       | ✓ RLS               |
| Negative stock prevention          | ✓ Postgres function |
| Duplicate sale (idempotency_key)   | ✓ UNIQUE constraint |
| Role-based mutation restrictions   | ✓ RLS + Edge Function |
| Refund own-sales-only (employee)   | ✓ RLS               |
| Audit log writes                   | ✓ Server trigger    |

### Which Checks May Happen on Client (Defense in Depth)

| Check                              | Client role        |
|------------------------------------|---------------------|
| Disable UI actions by role         | UX only, not security |
| Show low-stock warning             | Local SQLite query  |
| Version conflict detection         | Pre-submit check    |
| Outbox age check (stale mutations) | Outbox processor    |

**Rule:** If a check has a security consequence, it must exist in Postgres regardless of
whether it also exists on the client.

### Audit Logging

Write audit logs via Postgres trigger on sensitive tables. Do not rely on Edge Functions
to write audit logs — they can be skipped by bugs.

```sql
CREATE OR REPLACE FUNCTION audit_log_trigger() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (business_id, branch_id, user_id, action, entity_type, entity_id, payload)
  VALUES (
    NEW.business_id,
    NEW.branch_id,
    auth.uid(),
    TG_OP || '_' || lower(TG_TABLE_NAME),
    TG_TABLE_NAME,
    NEW.id,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_refunds AFTER INSERT ON refunds
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_inventory_adjustments AFTER INSERT ON inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
```

### Sensitive Data Handling

- Prices are integers (cents), never floats. No rounding errors in financial records.
- Payment method is an enum. No free-text payment fields.
- No PII stored beyond what Supabase Auth manages (name, email in auth.users).
- Device IDs are client-generated stable identifiers (e.g. UUID stored in secure storage).
  They are not used for security decisions — only for audit traceability.

### Protection Against Replayed Mutations

- Every mutation carries a UUID `idempotency_key` generated at mutation creation time.
- Keys are stored permanently in the relevant table (sales, refunds, inventory_adjustments).
- A replayed mutation with the same key is a no-op — returns the original result.
- Keys are never reused. The client generates a new key for each new user action.

---

## 7. Conflict and Consistency Rules

### Sale Commit Transaction

The following must execute atomically in a single Postgres transaction:

```
1. Check idempotency_key — if exists, return existing sale
2. Validate stock for every line item (FOR UPDATE lock on inventory_items rows)
3. Reject if any item has insufficient stock
4. INSERT sale (status: 'completed')
5. INSERT sale_items (all line items)
6. INSERT payments (all payment records)
7. Call apply_inventory_delta() for each line item (delta = -quantity)
8. Generate reference_number
9. Trigger audit_log
10. COMMIT
```

### Refund Transaction

```
1. Check idempotency_key
2. Validate original_sale_id exists and status = 'completed'
3. Validate refund is not for a sale from another employee (if role = 'employee')
4. Validate refund items match original sale items (quantity <= original quantity)
5. INSERT refund
6. INSERT refund_items
7. Call apply_inventory_delta() for each refund item (delta = +quantity, reason = 'refund_return')
8. UPDATE sales SET status = 'refunded' WHERE id = original_sale_id
9. Trigger audit_log
10. COMMIT
```

### Inventory Adjustment Transaction

```
1. Check idempotency_key
2. Validate delta would not cause quantity < 0
3. Apply delta via apply_inventory_delta()
4. Trigger audit_log
5. COMMIT
```

---

## 8. Best Practices

### Offline-First UX Patterns

- Show a persistent sync status indicator (synced / pending / offline)
- Visually distinguish pending (outbox) records from confirmed records
- Never block the UI waiting for network confirmation
- Surface failed mutations prominently — do not silently discard them
- On reconnect, show a brief "Syncing X pending changes" indicator

### Schema Design Patterns

- Every business-scoped table has a `business_id` column — no exceptions
- Store money as integer cents — no exceptions
- Use UUIDs for all primary keys (safe for client-side generation)
- Denormalize `business_id` onto child tables for RLS performance
- Use append-only tables for all financial records (sales, payments, refunds, adjustments)
- Use `version` integer on mutable non-financial records (products, variants) for optimistic locking

### Sync-Safe Mutation Design

- Every mutation carries an `idempotency_key` generated by the client
- Never send absolute values for stock — always send deltas
- Never let the client compute final totals that the server also computes — pick one
  (recommendation: client computes for display, server recomputes and stores authoritative value)
- Keep the outbox ordered by `created_at` — process mutations in the order they were created

### Auditability

- Audit logs are written by Postgres triggers, not application code
- Every audit log record includes: user_id, device_id, timestamp, full payload snapshot
- Audit logs are never deleted
- Owners can query audit logs for their business only (RLS enforced)

---

## 9. Anti-Patterns to Avoid

| Anti-Pattern                                        | Why It Fails                                                        |
|-----------------------------------------------------|---------------------------------------------------------------------|
| Trusting client for stock validation                | Offline clients have stale data. Two devices can both think stock > 0. |
| Storing prices as FLOAT or DECIMAL in SQLite        | PowerSync maps Postgres NUMERIC to SQLite REAL. Floating-point errors in money. |
| Allowing client to write absolute stock counts      | Concurrent offline adjustments overwrite each other. Use deltas.    |
| Skipping idempotency keys                           | Retry on reconnect submits duplicate sales. Data corruption.        |
| Writing audit logs only in Edge Functions           | Edge Function bugs skip the log. Use Postgres triggers.             |
| Syncing all branches to employee devices            | Privacy violation. Employees see other branches' data.              |
| Using only updated_at for conflict detection        | Clock skew between devices causes silent overwrites. Use version integer. |
| Letting local SQLite be the source of truth         | Local state is cache. Server state is truth. Roll back on rejection. |
| Allowing void/cancel of completed sales             | Use refund as the post-commit reversal. Void is pre-payment only.   |
| Single RLS policy per table without action checks   | Employee can adjust inventory reason 'void_correction' without restriction. |

---

## 10. Implementation Checklist — Vertical Slices

Complete each slice fully (schema → RLS → sync rule → local read → write API → tests)
before starting the next. Do not move to the next slice until all tests in the current
slice pass.

```
SLICE 0 — FOUNDATION
  ☐ Create Supabase project
  ☐ Create: businesses, branches, business_members, branch_members tables
  ☐ Enable RLS on all tables with tenant isolation policies
  ☐ Test RLS: two fake businesses — confirm zero cross-tenant data leakage
  ☐ Configure Supabase Auth with custom JWT claims: role, business_id, branch_id
  ☐ Connect PowerSync project to Supabase
  ☐ Install PowerSync client SDK in mobile app
  ☐ Confirm: app initialises, authenticates, local SQLite created
  ☐ Create outbox table in local SQLite
  ☐ Implement outbox processor with retry logic
  ☐ Implement sync status indicator in UI (offline / syncing / synced)

SLICE 1 — PRODUCTS
  ☐ Create: products, product_variants tables
  ☐ RLS: both roles can INSERT and UPDATE; archived check on SELECT
  ☐ Add version field and optimistic lock to save_product Edge Function
  ☐ PowerSync sync rule: products and variants by business_id
  ☐ Local read: query products and variants from SQLite
  ☐ UI: product list, add product, edit product, archive product
  ☐ Test: version conflict — two users edit same product simultaneously
  ☐ Test: archived products excluded from sync
  ☐ Test: offline product edit queued and applied on reconnect

SLICE 2 — INVENTORY
  ☐ Create: inventory_items, inventory_adjustments tables
  ☐ Create: apply_inventory_delta() Postgres function with negative-stock guard
  ☐ RLS: both roles can insert adjustments with allowed reason types
  ☐ PowerSync sync rule: inventory_items by branch_id
  ☐ Local read: show current stock per variant per branch
  ☐ UI: inventory list, manual adjustment form, low-stock indicator
  ☐ Test: negative stock rejection (delta would drive quantity below zero)
  ☐ Test: two employees adjust same item offline — both sync — correct final count
  ☐ Test: idempotency — same adjustment submitted twice — applied once

SLICE 3 — SALES
  ☐ Create: sales, sale_items, payments tables
  ☐ Create: commit_sale() Postgres function (atomic: validate stock → insert → decrement)
  ☐ RLS: employee sees own sales only; owner sees all in business
  ☐ PowerSync sync rule: sales filtered by created_by for employees
  ☐ Local read: sale history for current user
  ☐ UI: sale creation flow, line items, payment methods (split payment), reference number display
  ☐ UI: pending sale indicator for outbox items
  ☐ Test: sale with insufficient stock rejected, stock unchanged
  ☐ Test: duplicate submission (same idempotency_key) returns original sale
  ☐ Test: split payment (two methods) recorded correctly
  ☐ Test: offline sale queued, committed on reconnect, stock decremented correctly

SLICE 4 — REFUNDS
  ☐ Create: refunds, refund_items tables
  ☐ Create: create_refund() Postgres function (validate → insert → return stock)
  ☐ RLS: employee refund policy restricted to own sales (created_by = auth.uid())
  ☐ PowerSync sync rule: refunds filtered by created_by for employees
  ☐ UI: refund flow accessible from sale detail
  ☐ Test: employee refunds own sale — succeeds, stock returned
  ☐ Test: employee attempts to refund another employee's sale — rejected
  ☐ Test: owner refunds any sale — succeeds
  ☐ Test: refunding already-refunded sale — rejected

SLICE 5 — AUDIT AND MONITORING
  ☐ Create: audit_logs table
  ☐ Postgres triggers on: sales, refunds, inventory_adjustments, products
  ☐ RLS: audit_logs readable by owners only
  ☐ PowerSync sync rule: audit_logs in owner bucket only
  ☐ Test: every sensitive mutation produces an audit log entry
  ☐ Test: employee cannot query audit_logs (zero rows returned)
  ☐ Implement stale outbox detection (mutations older than 30 minutes flagged in UI)
  ☐ Implement failed mutation recovery UI (list failed outbox entries with retry/discard)
```

---

## 11. PowerSync SDK Constraints — Mandatory Awareness

The following PowerSync-specific behaviors must be accounted for in implementation.
They are not optional notes — ignoring them causes data corruption or architecture failure.

### Constraint 1 — SQLite Type Mapping

| Postgres Type       | SQLite Type    | Impact                                                  |
|---------------------|----------------|---------------------------------------------------------|
| UUID                | TEXT           | Compare as strings. Do not cast.                        |
| BOOLEAN             | INTEGER (0/1)  | Check `=== 1` not `=== true` in queries.               |
| NUMERIC / DECIMAL   | REAL           | **Store all money as INTEGER CENTS. Never DECIMAL.**    |
| TIMESTAMPTZ         | TEXT (ISO8601) | Parse explicitly. Do not assume Date object.            |
| JSONB               | TEXT           | Parse with JSON.parse() in the client.                  |

### Constraint 2 — Sync Rules Are Static

Sync rules are deployed at the PowerSync project level and cannot be changed per-device
at runtime. The scope of what syncs to a device is determined by the JWT claims at
authentication time. To change what a user syncs (e.g. owner drilling into a specific branch),
you must either include sufficient claims in the JWT at login or use multiple named buckets
with selective subscription.

### Constraint 3 — No Built-In Mutation Queue

PowerSync syncs data from Supabase to the client. It does not manage the write path.
The outbox table and outbox processor described in Section 4 are mandatory client-side
implementations. Without them, offline writes are lost on app restart.

### Constraint 4 — Schema Changes Require Sync Rule Redeployment

Adding a column to a synced table requires:
1. Postgres migration (additive — new column with a default value)
2. Sync rules update and redeployment to PowerSync
3. Client app update to handle the new column in SQLite

Always make migrations additive. Never rename or remove columns from synced tables
in a single deployment. Use a deprecation cycle: add new column → migrate data → remove old column
in a later release.

### Constraint 5 — Optimistic State Must Be Visually Distinct

Local SQLite contains both confirmed (synced from server) and optimistic (outbox pending)
records. The UI must distinguish between them. Use the outbox status to drive visual state:

```javascript
// Query sales with their outbox status
const sales = await localDb.query(`
  SELECT s.*, o.status as outbox_status
  FROM sales s
  LEFT JOIN outbox o ON o.payload LIKE '%' || s.idempotency_key || '%'
  ORDER BY s.created_at DESC
`);

// In UI: show pending badge if outbox_status = 'pending' or 'submitted'
```