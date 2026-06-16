import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createLoadFixtureDataset } from '../src/testing/loadFixtures.ts';

test('createLoadFixtureDataset creates deterministic product and sale volumes', () => {
  const dataset = createLoadFixtureDataset({
    businessId: 'business-1',
    branchId: 'branch-1',
    employeeId: 'employee-1',
    productCount: 500,
    saleCount: 1000,
    inventoryLogDays: 30,
  });

  assert.equal(dataset.products.length, 500);
  assert.equal(dataset.inventory.length, 500);
  assert.equal(dataset.sales.length, 1000);
  assert.equal(dataset.saleItems.length, 1000);
  assert.equal(dataset.payments.length, 1000);
  assert.equal(dataset.inventoryLogs.length, 30);
  assert.equal(dataset.products[0].id, 'load-product-0001');
  assert.equal(dataset.products[499].id, 'load-product-0500');
  assert.equal(dataset.sales[0].idempotency_key, 'load-idem-0001');
});

test('createLoadFixtureDataset preserves business and branch scope across rows', () => {
  const dataset = createLoadFixtureDataset({
    businessId: 'business-1',
    branchId: 'branch-1',
    employeeId: 'employee-1',
    productCount: 2,
    saleCount: 2,
    inventoryLogDays: 2,
  });

  assert.equal(dataset.products.every((row) => row.business_id === 'business-1'), true);
  assert.equal(dataset.inventory.every((row) => row.branch_id === 'branch-1'), true);
  assert.equal(dataset.sales.every((row) => row.sync_status === 'synced'), true);
  assert.equal(dataset.payments.every((row) => row.status === 'paid'), true);
  assert.equal(dataset.inventoryLogs.every((row) => row.business_id === 'business-1'), true);
});
