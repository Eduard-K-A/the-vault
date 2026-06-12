import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildInventoryForBranchQuery,
  buildSaleInventoryLookupQuery,
} from '../src/db/queries/inventoryQueries.ts';

test('buildInventoryForBranchQuery reads synced inventory plus fallback inventory', () => {
  assert.deepEqual(buildInventoryForBranchQuery('branch-1'), {
    sql:
      'SELECT * FROM inventory_items WHERE branch_id = ? UNION ALL SELECT fallback_inventory_items.* FROM fallback_inventory_items WHERE branch_id = ? AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = fallback_inventory_items.id)',
    parameters: ['branch-1', 'branch-1'],
  });
});

test('buildInventoryForBranchQuery uses an impossible branch id when no branch is selected', () => {
  assert.deepEqual(buildInventoryForBranchQuery(null), {
    sql:
      'SELECT * FROM inventory_items WHERE branch_id = ? UNION ALL SELECT fallback_inventory_items.* FROM fallback_inventory_items WHERE branch_id = ? AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = fallback_inventory_items.id)',
    parameters: ['__no_active_branch__', '__no_active_branch__'],
  });
});

test('buildSaleInventoryLookupQuery reads fallback stock when synced inventory is absent', () => {
  assert.deepEqual(buildSaleInventoryLookupQuery('product-1', 'branch-1'), {
    sql:
      "SELECT inventory_items.*, 'inventory_items' AS source_table FROM inventory_items WHERE product_id = ? AND branch_id = ? UNION ALL SELECT fallback_inventory_items.*, 'fallback_inventory_items' AS source_table FROM fallback_inventory_items WHERE product_id = ? AND branch_id = ? AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE product_id = ? AND branch_id = ?) LIMIT 1",
    parameters: ['product-1', 'branch-1', 'product-1', 'branch-1', 'product-1', 'branch-1'],
  });
});
