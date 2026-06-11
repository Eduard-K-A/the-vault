import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shouldLoadBootstrapSnapshot } from '../src/services/offlineHelpers.ts';

test('shouldLoadBootstrapSnapshot does not seed synced tables during authenticated PowerSync sessions', () => {
  assert.equal(
    shouldLoadBootstrapSnapshot({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60_000,
      userId: 'user-1',
      email: 'employee@example.com',
      fullname: 'Employee',
      role: 'employee',
    }),
    false,
  );
});
