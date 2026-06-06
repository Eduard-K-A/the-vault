import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hydrateAvailableBusinessesFromSources } from '../src/services/authBusinessHydrationHelpers.ts';

test('hydrateAvailableBusinessesFromSources shows owner-created business immediately when local summaries are empty', async () => {
  const hydrated: unknown[] = [];

  const summaries = await hydrateAvailableBusinessesFromSources({
    userId: 'owner-1',
    loadRemoteBusinessSummaries: async () => [
      {
        businessId: 'business-1',
        businessName: 'Northwind Market',
        role: 'owner',
        branchId: null,
        branchName: null,
      },
    ],
    loadLocalBusinessSummaries: async () => [],
    setAvailableBusinesses: (businesses) => {
      hydrated.push(...businesses);
    },
  });

  assert.deepEqual(summaries, [
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: null,
      branchName: null,
    },
  ]);
  assert.deepEqual(hydrated, summaries);
});

test('hydrateAvailableBusinessesFromSources falls back to local summaries when remote loading fails', async () => {
  const hydrated: unknown[] = [];

  const summaries = await hydrateAvailableBusinessesFromSources({
    userId: 'employee-1',
    loadRemoteBusinessSummaries: async () => {
      throw new Error('network unavailable');
    },
    loadLocalBusinessSummaries: async () => [
      {
        businessId: 'business-2',
        businessName: 'Local Shop',
        role: 'employee',
        branchId: 'branch-2',
        branchName: 'Main Branch',
      },
    ],
    setAvailableBusinesses: (businesses) => {
      hydrated.push(...businesses);
    },
  });

  assert.deepEqual(summaries, [
    {
      businessId: 'business-2',
      businessName: 'Local Shop',
      role: 'employee',
      branchId: 'branch-2',
      branchName: 'Main Branch',
    },
  ]);
  assert.deepEqual(hydrated, summaries);
});
