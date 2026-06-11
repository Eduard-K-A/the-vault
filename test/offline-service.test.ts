import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shouldLoadBootstrapSnapshot } from '../src/services/offlineHelpers.ts';

test('shouldLoadBootstrapSnapshot keeps bootstrap snapshots out of synced tables', () => {
  assert.equal(shouldLoadBootstrapSnapshot(null), false);
  assert.equal(shouldLoadBootstrapSnapshot({ accessToken: null } as never), false);
  assert.equal(shouldLoadBootstrapSnapshot({ accessToken: '' } as never), false);
  assert.equal(shouldLoadBootstrapSnapshot({ accessToken: 'token' } as never), false);
});
