import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadSupabaseBusinessSummariesForUser } from '../src/services/supabaseBusinessSummaries.ts';

function createQueryResult<T>(data: T[]) {
  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    in() {
      return query;
    },
    then(resolve: (value: { data: T[]; error: null }) => void) {
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };

  return query;
}

function createClient(resultsByTable: Record<string, unknown[]>) {
  return {
    from(table: string) {
      return createQueryResult(resultsByTable[table] ?? []);
    },
  };
}

test('loadSupabaseBusinessSummariesForUser uses edge function summaries when table reads are RLS-empty', async () => {
  const summaries = await loadSupabaseBusinessSummariesForUser(
    {
      functions: {
        async invoke(name: string) {
          assert.equal(name, 'business-summaries');
          return {
            data: {
              summaries: [
                {
                  businessId: 'business-1',
                  businessName: 'Northwind Market',
                  role: 'owner',
                  branchId: null,
                  branchName: null,
                },
              ],
            },
            error: null,
          };
        },
      },
      from(table: string) {
        return createQueryResult([]);
      },
    },
    'owner-1',
  );

  assert.deepEqual(summaries, [
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: null,
      branchName: null,
    },
  ]);
});

test('loadSupabaseBusinessSummariesForUser returns owned businesses when business_members is empty', async () => {
  const summaries = await loadSupabaseBusinessSummariesForUser(
    createClient({
      businesses: [
        {
          id: 'business-1',
          name: 'Northwind Market',
        },
      ],
      business_members: [],
    }),
    'owner-1',
  );

  assert.deepEqual(summaries, [
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: null,
      branchName: null,
    },
  ]);
});

test('loadSupabaseBusinessSummariesForUser includes an owned business branch when business_members is empty', async () => {
  const summaries = await loadSupabaseBusinessSummariesForUser(
    createClient({
      businesses: [
        {
          id: 'business-1',
          name: 'Northwind Market',
        },
      ],
      business_members: [],
      branches: [
        {
          id: 'branch-1',
          business_id: 'business-1',
          name: 'Main Branch',
        },
      ],
    }),
    'owner-1',
  );

  assert.deepEqual(summaries, [
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: 'branch-1',
      branchName: 'Main Branch',
    },
  ]);
});

test('loadSupabaseBusinessSummariesForUser dedupes owned and membership-derived businesses', async () => {
  const summaries = await loadSupabaseBusinessSummariesForUser(
    createClient({
      businesses: [
        {
          id: 'business-1',
          name: 'Northwind Market',
        },
      ],
      business_members: [
        {
          business_id: 'business-1',
          role: 'employee',
          branch_id: 'branch-1',
        },
      ],
      branches: [
        {
          id: 'branch-1',
          name: 'Main Branch',
        },
      ],
    }),
    'owner-1',
  );

  assert.deepEqual(summaries, [
    {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'owner',
      branchId: 'branch-1',
      branchName: 'Main Branch',
    },
  ]);
});
