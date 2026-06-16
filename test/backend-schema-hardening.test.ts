import assert from 'node:assert/strict';
import { test } from 'node:test';

import { schemaStatements } from '../src/db/schema.ts';

test('sales schema enforces idempotency and separated sync lifecycle fields', () => {
  const sales = schemaStatements.sales;

  assert.match(sales, /idempotency_key UUID NOT NULL/);
  assert.match(sales, /UNIQUE \(business_id, idempotency_key\)/);
  assert.match(sales, /status TEXT NOT NULL DEFAULT 'pending'/);
  assert.match(sales, /sync_status TEXT NOT NULL DEFAULT 'sync_pending'/);
  assert.match(sales, /sync_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK \(sync_attempt_count >= 0\)/);
});

test('payments schema tracks payment lifecycle separately from sales', () => {
  const payments = schemaStatements.payments;

  assert.match(payments, /branch_id UUID REFERENCES branches\(id\)/);
  assert.match(payments, /status TEXT NOT NULL DEFAULT 'paid'/);
  assert.match(payments, /provider_reference TEXT/);
  assert.match(payments, /offline_approved BOOLEAN NOT NULL DEFAULT false/);
  assert.match(payments, /UNIQUE \(business_id, provider, provider_reference\)/);
});

test('inventory log schema is business scoped and auditable', () => {
  const inventoryLogs = schemaStatements.inventory_logs;

  assert.match(inventoryLogs, /business_id UUID NOT NULL REFERENCES businesses\(id\)/);
  assert.match(inventoryLogs, /quantity_before INTEGER NOT NULL/);
  assert.match(inventoryLogs, /quantity_changed INTEGER NOT NULL/);
  assert.match(inventoryLogs, /quantity_after INTEGER NOT NULL/);
  assert.match(inventoryLogs, /reason TEXT/);
  assert.match(inventoryLogs, /synced_at TIMESTAMPTZ/);
});
