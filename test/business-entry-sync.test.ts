import assert from 'node:assert/strict';
import { test } from 'node:test';

import { enterSelectedBusiness } from '../src/store/businessEntrySync.ts';

test('enterSelectedBusiness records selected business context and refreshes sync', async () => {
  const sessions: unknown[] = [];
  let syncCalls = 0;
  const hydratedBusinessIds: string[] = [];

  await enterSelectedBusiness(
    {
      userId: 'user-1',
      businessId: 'business-1',
      branchId: 'branch-1',
    },
    {
      setSyncSession: (session) => {
        sessions.push(session);
      },
      hydrateBusinessData: async (businessId) => {
        hydratedBusinessIds.push(businessId);
      },
      syncNow: async () => {
        syncCalls += 1;
      },
    },
  );

  assert.deepEqual(sessions, [
    {
      userId: 'user-1',
      businessId: 'business-1',
      branchId: 'branch-1',
    },
  ]);
  assert.deepEqual(hydratedBusinessIds, ['business-1']);
  assert.equal(syncCalls, 1);
});

test('enterSelectedBusiness still records business context when sync refresh fails', async () => {
  const sessions: unknown[] = [];
  const errors: string[] = [];

  await enterSelectedBusiness(
    {
      userId: 'user-1',
      businessId: 'business-1',
      branchId: null,
    },
    {
      setSyncSession: (session) => {
        sessions.push(session);
      },
      syncNow: async () => {
        throw new Error('Remote unavailable');
      },
      setLastError: (message) => {
        errors.push(message);
      },
    },
  );

  assert.deepEqual(sessions, [
    {
      userId: 'user-1',
      businessId: 'business-1',
      branchId: null,
    },
  ]);
  assert.deepEqual(errors, ['Remote unavailable']);
});
