import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDeleteBusinessEnvelope } from '../src/services/deleteBusinessHelpers.ts';

test('buildDeleteBusinessEnvelope targets the business delete function payload', () => {
  assert.deepEqual(buildDeleteBusinessEnvelope('business-1'), {
    op: 'DELETE',
    payload: {
      id: 'business-1',
      table: 'businesses',
    },
  });
});
