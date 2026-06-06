import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildJoinedBusinessSummary,
  isSupabaseFunctionNotFoundError,
  mergeBusinessSummary,
  normalizeJoinCode,
} from '../src/services/joinBusinessHelpers.ts';

test('normalizeJoinCode trims and uppercases employee-entered codes', () => {
  assert.equal(normalizeJoinCode(' a3x9kl '), 'A3X9KL');
});

test('buildJoinedBusinessSummary maps validate-join-code response into a usable employee summary', () => {
  assert.deepEqual(
    buildJoinedBusinessSummary(
      {
        business_id: 'business-1',
        business_name: 'Northwind Market',
      },
      'employee',
    ),
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'employee',
      branchId: null,
      branchName: null,
    },
  );
});

test('isSupabaseFunctionNotFoundError detects missing edge function responses', async () => {
  assert.equal(
    await isSupabaseFunctionNotFoundError({
      context: {
        status: 404,
        clone() {
          return {
            async text() {
              return '{"code":"NOT_FOUND","message":"Requested function was not found"}';
            },
          };
        },
      },
    }),
    true,
  );
});

test('mergeBusinessSummary keeps a remotely joined business visible until local rows sync', () => {
  assert.deepEqual(
    mergeBusinessSummary(
      [],
      {
        businessId: 'business-1',
        businessName: 'Northwind Market',
        role: 'employee',
        branchId: null,
        branchName: null,
      },
    ),
    [
      {
        businessId: 'business-1',
        businessName: 'Northwind Market',
        role: 'employee',
        branchId: null,
        branchName: null,
      },
    ],
  );
});
