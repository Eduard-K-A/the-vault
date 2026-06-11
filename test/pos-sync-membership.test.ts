import assert from 'node:assert/strict';
import { test } from 'node:test';

import { selectActiveMembership } from '../supabase/functions/_shared/membership.ts';

test('selectActiveMembership limits duplicate active membership rows before maybeSingle', async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder = {
    select(...args: unknown[]) {
      calls.push({ method: 'select', args });
      return this;
    },
    eq(...args: unknown[]) {
      calls.push({ method: 'eq', args });
      return this;
    },
    limit(...args: unknown[]) {
      calls.push({ method: 'limit', args });
      return this;
    },
    async maybeSingle() {
      calls.push({ method: 'maybeSingle', args: [] });
      return { data: { id: 'member-1' }, error: null };
    },
  };

  const result = await selectActiveMembership(
    {
      from(table: string) {
        calls.push({ method: 'from', args: [table] });
        return builder;
      },
    },
    'business-1',
    'user-1',
  );

  assert.deepEqual(result, { data: { id: 'member-1' }, error: null });
  assert.deepEqual(calls, [
    { method: 'from', args: ['business_members'] },
    { method: 'select', args: ['id'] },
    { method: 'eq', args: ['business_id', 'business-1'] },
    { method: 'eq', args: ['user_id', 'user-1'] },
    { method: 'eq', args: ['is_active', true] },
    { method: 'limit', args: [1] },
    { method: 'maybeSingle', args: [] },
  ]);
});
