import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runManualSyncSteps } from '../src/services/powersyncManualSyncHelpers.ts';

test('runManualSyncSteps rejects when first sync never finishes', async () => {
  await assert.rejects(
    runManualSyncSteps(
      {
        isConnected: () => false,
        disconnect: async () => {},
        initialize: async () => {},
        connect: async () => {},
        waitForFirstSync: () => new Promise<void>(() => {}),
        getUploadQueueCount: async () => 0,
        sleep: async () => {},
      },
      {
        operationTimeoutMs: 5,
        uploadQueueTimeoutMs: 5,
        uploadQueuePollMs: 1,
      },
    ),
    /Manual sync timed out while waiting for the first sync to finish/i,
  );
});

test('runManualSyncSteps rejects when upload queue does not drain', async () => {
  await assert.rejects(
    runManualSyncSteps(
      {
        isConnected: () => false,
        disconnect: async () => {},
        initialize: async () => {},
        connect: async () => {},
        waitForFirstSync: async () => {},
        getUploadQueueCount: async () => 1,
        sleep: async () => {},
      },
      {
        operationTimeoutMs: 5,
        uploadQueueTimeoutMs: 5,
        uploadQueuePollMs: 1,
        now: (() => {
          let current = 0;
          return () => {
            current += 10;
            return current;
          };
        })(),
      },
    ),
    /Manual sync timed out while waiting for 1 pending upload to drain/i,
  );
});

test('runManualSyncSteps rejects when upload queue stats never return', async () => {
  await assert.rejects(
    runManualSyncSteps(
      {
        isConnected: () => false,
        disconnect: async () => {},
        initialize: async () => {},
        connect: async () => {},
        waitForFirstSync: async () => {},
        getUploadQueueCount: () => new Promise<number>(() => {}),
        sleep: async () => {},
      },
      {
        operationTimeoutMs: 5,
        uploadQueueTimeoutMs: 5,
        uploadQueuePollMs: 1,
      },
    ),
    /Manual sync timed out while checking the upload queue status/i,
  );
});
