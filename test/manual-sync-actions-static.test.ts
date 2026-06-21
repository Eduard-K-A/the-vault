import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('inventory, sales, and employees expose manual sync actions', () => {
  const screens = [
    { path: 'src/features/inventory/InventoryScreen.tsx', trace: 'inventory-sync-now' },
    { path: 'src/features/sales/SalesScreen.tsx', trace: 'sales-sync-now' },
    { path: 'src/features/employees/EmployeeListScreen.tsx', trace: 'employees-sync-now' },
  ];

  for (const screen of screens) {
    const source = read(screen.path);

    assert.match(source, /syncPowerSyncNow/);
    assert.match(source, /createSyncTraceId/);
    assert.match(source, new RegExp(screen.trace));
    assert.match(source, /Manual sync failed/);
    assert.match(source, /accessibilityLabel="Sync now"/);
  }
});

test('inventory product cards pass an explicit edit action', () => {
  const inventory = read('src/features/inventory/InventoryScreen.tsx');

  assert.match(inventory, /onEdit=\{/);
  assert.match(inventory, /navigation\.navigate\('EditProduct', \{ productId: item\.id \}\)/);
});
