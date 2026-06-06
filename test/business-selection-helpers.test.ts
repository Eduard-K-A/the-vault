import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildFallbackBusinessFromSummary } from '../src/store/businessSelectionHelpers.ts';

test('buildFallbackBusinessFromSummary creates a selectable business from a joined summary', () => {
  assert.deepEqual(
    buildFallbackBusinessFromSummary(
      {
        businessId: 'business-1',
        businessName: 'Northwind Market',
        role: 'employee',
        branchId: null,
        branchName: null,
      },
      '2026-06-06T00:00:00.000Z',
    ),
    {
      id: 'business-1',
      name: 'Northwind Market',
      owner_id: '',
      join_code: '',
      logo_url: null,
      address: null,
      is_active: true,
      created_at: '2026-06-06T00:00:00.000Z',
    },
  );
});
