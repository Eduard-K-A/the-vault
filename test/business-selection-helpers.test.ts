import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildFallbackBranchFromSummary,
  buildFallbackBusinessFromSummary,
  resolveSelectableBranch,
} from '../src/store/businessSelectionHelpers.ts';

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

test('resolveSelectableBranch retries the first active branch after hydration when summary has no branch id', async () => {
  let hydrated = false;

  const branch = await resolveSelectableBranch(
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: null,
      branchName: null,
    },
    async () => {
      return !hydrated
        ? null
        : {
            id: 'branch-1',
            business_id: 'business-1',
            name: 'Main Branch',
            is_active: true,
          };
    },
    async () => {
      hydrated = true;
    },
  );

  assert.equal(branch?.id, 'branch-1');
  assert.equal(hydrated, true);
});

test('resolveSelectableBranch can read a refreshed fallback branch when synced branches are still empty', async () => {
  let hydrated = false;
  let fallbackLookupSql: string | null = null;

  const branch = await resolveSelectableBranch(
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: null,
      branchName: null,
    },
    async (sql) => {
      if (sql.includes('fallback_branches')) {
        fallbackLookupSql = sql;
      }

      return hydrated && sql.includes('fallback_branches')
        ? {
            id: 'branch-1',
            business_id: 'business-1',
            name: 'Main Branch',
            is_active: true,
          }
        : null;
    },
    async () => {
      hydrated = true;
    },
  );

  assert.equal(branch?.id, 'branch-1');
  assert.ok(fallbackLookupSql);
});

test('resolveSelectableBranch can read a summary branch id from fallback branches', async () => {
  let fallbackLookupSql: string | null = null;

  const branch = await resolveSelectableBranch(
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'employee',
      branchId: 'branch-1',
      branchName: 'Main Branch',
    },
    async (sql) => {
      if (sql.includes('fallback_branches')) {
        fallbackLookupSql = sql;
        return {
          id: 'branch-1',
          business_id: 'business-1',
          name: 'Main Branch',
          is_active: true,
        };
      }

      return null;
    },
  );

  assert.equal(branch?.id, 'branch-1');
  assert.ok(fallbackLookupSql);
});
