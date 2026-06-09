import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runManualSyncSteps } from '../src/services/powersyncManualSyncHelpers.ts';

test('runManualSyncSteps waits for pull sync before completing', async () => {
  let finishPullSync: (() => void) | null = null;
  let completed = false;
  let markPullStarted: (() => void) | null = null;
  const pullStarted = new Promise<void>((resolve) => {
    markPullStarted = resolve;
  });

  const syncPromise = runManualSyncSteps(
    {
      isConnected: () => false,
      disconnect: async () => {},
      initialize: async () => {},
      connect: async () => {},
      getUploadQueueCount: async () => 0,
      pullLatestData: () =>
        new Promise<void>((resolve) => {
          markPullStarted?.();
          finishPullSync = resolve;
        }),
      sleep: async () => {},
    },
    {
      operationTimeoutMs: 1000,
      uploadQueueTimeoutMs: 5,
      uploadQueuePollMs: 1,
    },
  ).then(() => {
    completed = true;
  });

  await pullStarted;
  assert.equal(completed, false);

  assert.notEqual(finishPullSync, null);
  finishPullSync();
  await syncPromise;
  assert.equal(completed, true);
});

test('runManualSyncSteps rejects when upload queue does not drain', async () => {
  await assert.rejects(
    runManualSyncSteps(
      {
        isConnected: () => false,
        disconnect: async () => {},
        initialize: async () => {},
        connect: async () => {},
        getUploadQueueCount: async () => 1,
        pullLatestData: async () => {},
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
        getUploadQueueCount: () => new Promise<number>(() => {}),
        pullLatestData: async () => {},
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

test('runManualSyncSteps connects before draining uploads after a new connection', async () => {
  const events: string[] = [];

  await runManualSyncSteps(
    {
      isConnected: () => false,
      disconnect: async () => {},
      initialize: async () => {},
      connect: async () => {
        events.push('connect');
      },
      getUploadQueueCount: async () => {
        events.push('upload-queue');
        return 0;
      },
      pullLatestData: async () => {
        events.push('pull');
      },
      sleep: async () => {},
    },
    {
      operationTimeoutMs: 5,
      uploadQueueTimeoutMs: 5,
      uploadQueuePollMs: 1,
    },
  );

  assert.deepEqual(events, ['connect', 'upload-queue', 'pull']);
});
