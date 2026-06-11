import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildSyncDebugPrefix, createSyncTraceId } from '../src/utils/syncDebug.ts';

test('createSyncTraceId includes the provided label', () => {
  assert.match(createSyncTraceId('sync-now'), /^sync-now-[a-z0-9]+-[a-z0-9]+$/);
});

test('buildSyncDebugPrefix formats trace-scoped log prefixes', () => {
  assert.equal(buildSyncDebugPrefix('sync-now-abc'), '[sync-now:sync-now-abc]');
});
