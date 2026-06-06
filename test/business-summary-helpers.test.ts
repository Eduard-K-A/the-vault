import assert from 'node:assert/strict';
import { test } from 'node:test';

import { composeBusinessSummaries } from '../src/services/businessSummaryHelpers.ts';

test('composeBusinessSummaries includes owned businesses even without membership rows', () => {
  assert.deepEqual(
    composeBusinessSummaries({
      ownedBusinesses: [
        {
          business_id: 'business-1',
          business_name: 'Northwind Market',
        },
      ],
      memberships: [],
    }),
    [
      {
        businessId: 'business-1',
        businessName: 'Northwind Market',
        role: 'owner',
        branchId: null,
        branchName: null,
      },
    ],
  );
});

test('composeBusinessSummaries merges membership branch data without losing owner role', () => {
  assert.deepEqual(
    composeBusinessSummaries({
      ownedBusinesses: [
        {
          business_id: 'business-1',
          business_name: 'Northwind Market',
        },
      ],
      memberships: [
        {
          business_id: 'business-1',
          business_name: 'Northwind Market',
          role: 'employee',
          branch_id: 'branch-1',
          branch_name: 'Main Branch',
        },
      ],
    }),
    [
      {
        businessId: 'business-1',
        businessName: 'Northwind Market',
        role: 'owner',
        branchId: 'branch-1',
        branchName: 'Main Branch',
      },
    ],
  );
});
