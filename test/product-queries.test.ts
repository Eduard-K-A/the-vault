import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildProductsForBusinessQuery } from '../src/db/queries/productQueries.ts';

test('buildProductsForBusinessQuery fetches active products by business_id', () => {
  assert.deepEqual(buildProductsForBusinessQuery('business-1'), {
    sql: 'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY updated_at DESC',
    parameters: ['business-1'],
  });
});

test('buildProductsForBusinessQuery uses an impossible business id when no business is selected', () => {
  assert.deepEqual(buildProductsForBusinessQuery(null), {
    sql: 'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY updated_at DESC',
    parameters: ['__no_active_business__'],
  });
});
