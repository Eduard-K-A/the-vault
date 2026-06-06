import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildFallbackBranchFromSummary, buildFallbackBusinessFromSummary } from '../src/store/businessSelectionHelpers.ts';

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

test('buildFallbackBranchFromSummary creates a selectable branch from a summary', () => {
  assert.deepEqual(
    buildFallbackBranchFromSummary({
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: 'branch-1',
      branchName: 'Main Branch',
    }),
    {
      id: 'branch-1',
      business_id: 'business-1',
      name: 'Main Branch',
      is_active: true,
    },
  );
});

test('buildFallbackBranchFromSummary returns null when the summary has no branch id', () => {
  assert.equal(
    buildFallbackBranchFromSummary({
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: null,
      branchName: null,
    }),
    null,
  );
});
