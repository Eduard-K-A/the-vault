import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('SalesScreen exposes only the compact manual sync action', () => {
  const source = readFileSync('src/features/sales/SalesScreen.tsx', 'utf8');

  assert.doesNotMatch(source, /refreshBusinessDataFromDatabase/);
  assert.doesNotMatch(source, /loadEmployeeSalesSnapshot/);
  assert.doesNotMatch(source, /sales screen sync button pressed/);
  assert.doesNotMatch(source, /applySnapshot: applyBusinessSnapshot/);
  assert.match(source, /syncPowerSyncNow/);
  assert.match(source, /createSyncTraceId\('sales-sync-now'\)/);
  assert.match(source, /accessibilityLabel="Sync now"/);
  assert.match(source, /loading=\{syncLoading\}/);
});
