import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildProfileFromAuthUser } from '../supabase/functions/add-member/profile.ts';

test('buildProfileFromAuthUser derives required profile fields from auth user metadata', () => {
  assert.deepEqual(
    buildProfileFromAuthUser('user-1', {
      email: 'employee@example.com',
      user_metadata: {
        fullname: 'Employee One',
        role: 'employee',
      },
      created_at: '2026-06-11T09:00:00.000Z',
    }),
    {
      id: 'user-1',
      fullname: 'Employee One',
      email: 'employee@example.com',
      role: 'employee',
      phone_number: null,
      avatar_url: null,
      created_at: '2026-06-11T09:00:00.000Z',
    },
  );
});

test('buildProfileFromAuthUser falls back to safe defaults', () => {
  assert.deepEqual(
    buildProfileFromAuthUser('user-1', {
      email: 'employee@example.com',
      user_metadata: {},
    }),
    {
      id: 'user-1',
      fullname: 'employee@example.com',
      email: 'employee@example.com',
      role: 'employee',
      phone_number: null,
      avatar_url: null,
      created_at: null,
    },
  );
});
