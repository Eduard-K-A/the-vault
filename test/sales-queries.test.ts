import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildPaymentsForBusinessQuery,
  buildSaleItemsForBusinessQuery,
  buildSalesForBusinessQuery,
} from '../src/db/queries/salesQueries.ts';

test('buildSalesForBusinessQuery reads synced sales plus fallback sales', () => {
  assert.deepEqual(buildSalesForBusinessQuery('business-1'), {
    sql:
      'SELECT * FROM sales WHERE business_id = ? UNION ALL SELECT fallback_sales.* FROM fallback_sales WHERE business_id = ? AND NOT EXISTS (SELECT 1 FROM sales WHERE sales.id = fallback_sales.id) ORDER BY created_at DESC',
    parameters: ['business-1', 'business-1'],
  });
});

test('buildSalesForBusinessQuery uses an impossible id when no business is selected', () => {
  assert.deepEqual(buildSalesForBusinessQuery(null), {
    sql:
      'SELECT * FROM sales WHERE business_id = ? UNION ALL SELECT fallback_sales.* FROM fallback_sales WHERE business_id = ? AND NOT EXISTS (SELECT 1 FROM sales WHERE sales.id = fallback_sales.id) ORDER BY created_at DESC',
    parameters: ['__no_active_business__', '__no_active_business__'],
  });
});

test('buildSaleItemsForBusinessQuery reads fallback sale items when synced items are absent', () => {
  assert.deepEqual(buildSaleItemsForBusinessQuery('business-1'), {
    sql:
      'SELECT * FROM sale_items WHERE business_id = ? UNION ALL SELECT fallback_sale_items.* FROM fallback_sale_items WHERE business_id = ? AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_items.id = fallback_sale_items.id)',
    parameters: ['business-1', 'business-1'],
  });
});

test('buildPaymentsForBusinessQuery reads fallback payments when synced payments are absent', () => {
  assert.deepEqual(buildPaymentsForBusinessQuery('business-1'), {
    sql:
      'SELECT * FROM payments WHERE business_id = ? UNION ALL SELECT fallback_payments.* FROM fallback_payments WHERE business_id = ? AND NOT EXISTS (SELECT 1 FROM payments WHERE payments.id = fallback_payments.id)',
    parameters: ['business-1', 'business-1'],
  });
});
