import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

function migrationSource(): string {
  return readdirSync('supabase/migrations')
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join('supabase/migrations', file), 'utf8'))
    .join('\n');
}

test('migrations add production sync, payment, inventory, and idempotency columns', () => {
  const source = migrationSource();

  assert.match(source, /add column if not exists sync_status/i);
  assert.match(source, /add column if not exists sync_attempt_count/i);
  assert.match(source, /add column if not exists last_sync_error_code/i);
  assert.match(source, /add column if not exists server_confirmed_at/i);
  assert.match(source, /sales_business_id_idempotency_key/i);
  assert.match(source, /add column if not exists branch_id uuid references branches\(id\)/i);
  assert.match(source, /add column if not exists status text not null default 'paid'/i);
  assert.match(source, /add column if not exists provider_reference text/i);
  assert.match(source, /payments_business_provider_reference/i);
  assert.match(source, /alter table if exists inventory_logs\s+add column if not exists business_id uuid/i);
  assert.match(source, /alter table if exists inventory_logs\s+add column if not exists reason text/i);
  assert.match(source, /alter table if exists inventory_logs\s+add column if not exists synced_at timestamptz/i);
});

test('migrations enable RLS and scoped policies for POS write tables', () => {
  const source = migrationSource();

  for (const table of ['sales', 'sale_items', 'payments', 'refunds', 'refund_items', 'inventory_logs', 'audit_logs']) {
    assert.match(source, new RegExp(`alter table if exists ${table} enable row level security`, 'i'));
  }

  assert.match(source, /can_access_branch\(target_branch_id uuid, target_business_id uuid\)/i);
  assert.match(source, /members can read sales/i);
  assert.match(source, /members can read payments/i);
  assert.match(source, /members can read inventory logs/i);
  assert.match(source, /members can read refunds/i);
});

test('commit_sale validates branch access and returns stable idempotent upload result', () => {
  const source = `${readFileSync('supabase/functions/commit_sale/index.ts', 'utf8')}\n${readFileSync(
    'supabase/functions/commit_sale/pos-sync.ts',
    'utf8',
  )}`;

  assert.match(source, /branch lookup started/);
  assert.match(source, /from\('branches'\)/);
  assert.match(source, /\.eq\('business_id', businessId\)/);
  assert.match(source, /already_committed: true/);
  assert.match(source, /already_committed: false/);
  assert.match(source, /sale_id: saleId/);
  assert.match(source, /synced_at: now/);
  assert.match(source, /server_reference_number/);
});

test('commit_sale persists sale, payment, and inventory lifecycle fields', () => {
  const source = readFileSync('supabase/functions/commit_sale/index.ts', 'utf8');

  assert.match(source, /sync_status: 'synced'/);
  assert.match(source, /sync_attempt_count: numberValue\(sale.sync_attempt_count, 1\)/);
  assert.match(source, /server_confirmed_at: now/);
  assert.match(source, /branch_id: nullableString\(payment.branch_id\) \?\? branchId/);
  assert.match(source, /status: stringValue\(payment.status\) \?\? 'paid'/);
  assert.match(source, /provider_reference: nullableString\(payment.provider_reference\)/);
  assert.match(source, /offline_approved: booleanValue\(payment.offline_approved, false\)/);
  assert.match(source, /business_id: businessId,\s+product_id: stringValue\(log.product_id\)/);
  assert.match(source, /reason: nullableString\(log.reason\)/);
  assert.match(source, /synced_at: now/);
});

test('refund and inventory functions validate branch/business scope and new movement fields', () => {
  const refund = `${readFileSync('supabase/functions/create_refund/index.ts', 'utf8')}\n${readFileSync(
    'supabase/functions/create_refund/pos-sync.ts',
    'utf8',
  )}`;
  const inventory = `${readFileSync('supabase/functions/apply_inventory_adjustment/index.ts', 'utf8')}\n${readFileSync(
    'supabase/functions/apply_inventory_adjustment/pos-sync.ts',
    'utf8',
  )}`;

  assert.match(refund, /requireOwner/);
  assert.match(refund, /from\('branches'\)/);
  assert.match(refund, /business_id: businessId,\s+product_id: stringValue\(log.product_id\)/);
  assert.match(refund, /reason: nullableString\(log.reason\)/);
  assert.match(refund, /synced_at: now/);

  assert.match(inventory, /from\('branches'\)/);
  assert.match(inventory, /business_id: businessId,\s+product_id: productId/);
  assert.match(inventory, /reason: nullableString\(log.reason\)/);
  assert.match(inventory, /synced_at: now/);
});
