import assert from 'node:assert/strict';
import { test } from 'node:test';

import { refreshBusinessDataWithDependencies } from '../src/services/businessDataRefreshHelpers.ts';

test('refreshBusinessDataFromDatabase fetches and applies selected business products', async () => {
  const appliedSnapshots: unknown[] = [];

  const result = await refreshBusinessDataWithDependencies('business-1', {
    fetchSnapshot: async (businessId) => ({
      businesses: [],
      branches: [],
      businessMembers: [],
      categories: [],
      products: [
        {
          id: 'product-1',
          business_id: businessId,
        },
      ],
    }),
    applySnapshot: async (snapshot) => {
      appliedSnapshots.push(snapshot);
    },
  });

  assert.deepEqual(result, {
    applied: true,
    productCount: 1,
  });
  assert.equal(appliedSnapshots.length, 1);
});

test('refreshBusinessDataFromDatabase reports no-op when remote database is unavailable', async () => {
  let applyCalled = false;

  const result = await refreshBusinessDataWithDependencies('business-1', {
    fetchSnapshot: async () => null,
    applySnapshot: async () => {
      applyCalled = true;
    },
  });

  assert.deepEqual(result, {
    applied: false,
    productCount: 0,
  });
  assert.equal(applyCalled, false);
});
