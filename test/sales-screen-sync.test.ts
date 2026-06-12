import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('SalesScreen exposes manual sync for sales and analytics refresh', () => {
  const source = readFileSync('src/features/sales/SalesScreen.tsx', 'utf8');

  assert.match(source, /syncPowerSyncNow/);
  assert.match(source, /buildSalesForBusinessQuery/);
  assert.match(source, /refreshBusinessDataFromDatabase/);
  assert.match(source, /createSyncTraceId\('sync-now'\)/);
  assert.match(source, /loadEmployeeSalesSnapshot/);
  assert.match(source, /logSyncDebug\(traceId, 'sales screen sync button pressed'/);
  assert.match(source, /logSyncDebug\(traceId, 'sales screen employee sales before sync'/);
  assert.match(source, /logSyncDebug\(traceId, 'sales screen employee sales after refresh'/);
  assert.doesNotMatch(source, /applySnapshot: applyBusinessSnapshot/);
  assert.match(source, /label="Sync now"/);
  assert.match(source, /loading=\{syncLoading\}/);
});
