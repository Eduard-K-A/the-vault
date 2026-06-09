import assert from 'node:assert/strict';
import { test } from 'node:test';

import { waitForManualPullConfirmation } from '../src/services/powersyncPullWaitHelpers.ts';

test('waitForManualPullConfirmation skips first-sync wait after a completed sync', async () => {
  let waitForFirstSyncCalled = false;

  await waitForManualPullConfirmation({
    getStatus: () => ({ hasSynced: true }),
    waitForFirstSync: async () => {
      waitForFirstSyncCalled = true;
    },
  });

  assert.equal(waitForFirstSyncCalled, false);
});

test('waitForManualPullConfirmation treats lastSyncedAt as completed sync evidence', async () => {
  let waitForFirstSyncCalled = false;

  await waitForManualPullConfirmation({
    getStatus: () => ({ lastSyncedAt: new Date() }),
    waitForFirstSync: async () => {
      waitForFirstSyncCalled = true;
    },
  });

  assert.equal(waitForFirstSyncCalled, false);
});

test('waitForManualPullConfirmation waits for first sync when no completed snapshot exists', async () => {
  let waitForFirstSyncCalled = false;

  await waitForManualPullConfirmation({
    getStatus: () => ({ connected: true, hasSynced: false }),
    waitForFirstSync: async () => {
      waitForFirstSyncCalled = true;
    },
  });

  assert.equal(waitForFirstSyncCalled, true);
});

test('waitForManualPullConfirmation rejects when first sync needs a disconnected stream', async () => {
  await assert.rejects(
    waitForManualPullConfirmation({
      getStatus: () => ({ connected: false, connecting: false, hasSynced: false }),
      waitForFirstSync: async () => {},
    }),
    /PowerSync is not connected/i,
  );
});

test('waitForManualPullConfirmation rejects active connection errors instead of waiting for timeout', async () => {
  await assert.rejects(
    waitForManualPullConfirmation({
      getStatus: () => ({
        connected: false,
        connecting: true,
        hasSynced: false,
        dataFlowStatus: {
          downloadError: new Error('[PSYNC_S2101] Could not find an appropriate key in the keystore.'),
        },
      }),
      waitForFirstSync: async () => {},
    }),
    /PowerSync connection failed.*PSYNC_S2101/i,
  );
});

test('waitForManualPullConfirmation waits for active download to become idle', async () => {
  let waitForDownloadIdleCalled = false;

  await waitForManualPullConfirmation({
    getStatus: () => ({ hasSynced: true, dataFlowStatus: { downloading: true } }),
    waitForFirstSync: async () => {},
    waitForDownloadIdle: async () => {
      waitForDownloadIdleCalled = true;
    },
  });

  assert.equal(waitForDownloadIdleCalled, true);
});

test('waitForManualPullConfirmation reports the selected confirmation path', async () => {
  const events: string[] = [];

  await waitForManualPullConfirmation({
    getStatus: () => ({ hasSynced: true }),
    waitForFirstSync: async () => {},
    debug: (message) => events.push(message),
  });

  assert.deepEqual(events, ['existing-snapshot']);
});
