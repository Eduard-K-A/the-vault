import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getBusinessDeletionStatements } from '../src/db/businessDeletionHelpers.ts';

test('getBusinessDeletionStatements deletes products before deleting the business', () => {
  const statements = getBusinessDeletionStatements();
  const productDeleteIndex = statements.findIndex((statement) => statement.sql === 'DELETE FROM products WHERE business_id = ?');
  const businessDeleteIndex = statements.findIndex((statement) => statement.sql === 'DELETE FROM businesses WHERE id = ?');

  assert.notEqual(productDeleteIndex, -1);
  assert.notEqual(businessDeleteIndex, -1);
  assert.equal(productDeleteIndex < businessDeleteIndex, true);
});

test('getBusinessDeletionStatements removes related product-dependent rows', () => {
  const sql = getBusinessDeletionStatements().map((statement) => statement.sql);

  assert.equal(sql.some((statement) => statement.startsWith('DELETE FROM inventory_items')), true);
  assert.equal(sql.some((statement) => statement.startsWith('DELETE FROM inventory_logs')), true);
  assert.equal(sql.some((statement) => statement.startsWith('DELETE FROM sale_items')), true);
  assert.equal(sql.some((statement) => statement.startsWith('DELETE FROM refund_items')), true);
});
