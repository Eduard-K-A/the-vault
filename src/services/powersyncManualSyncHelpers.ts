export interface ManualSyncOperations {
  isConnected: () => boolean;
  disconnect: () => Promise<void>;
  initialize: () => Promise<void>;
  connect: () => Promise<void>;
  waitForFirstSync: () => Promise<void>;
  getUploadQueueCount: () => Promise<number>;
  sleep?: (ms: number) => Promise<void>;
}

export interface ManualSyncOptions {
  operationTimeoutMs: number;
  uploadQueueTimeoutMs: number;
  uploadQueuePollMs: number;
  now?: () => number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(label));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function manualSyncTimeout(phase: string): string {
  return `Manual sync timed out while ${phase}.`;
}

async function waitForUploadQueueToDrain(
  operations: ManualSyncOperations,
  options: ManualSyncOptions,
): Promise<void> {
  const now = options.now ?? Date.now;
  const pause = operations.sleep ?? sleep;
  const deadline = now() + options.uploadQueueTimeoutMs;

  for (;;) {
    const count = await withTimeout(
      operations.getUploadQueueCount(),
      options.operationTimeoutMs,
      manualSyncTimeout('checking the upload queue status'),
    );
    if (count === 0) {
      return;
    }

    if (now() >= deadline) {
      throw new Error(manualSyncTimeout(`waiting for ${count} pending upload${count === 1 ? '' : 's'} to drain`));
    }

    await pause(options.uploadQueuePollMs);
  }
}

export async function runManualSyncSteps(
  operations: ManualSyncOperations,
  options: ManualSyncOptions,
): Promise<void> {
  console.log('[powersync] manual sync started');
  const wasConnected = operations.isConnected();

  if (!wasConnected) {
    console.log('[powersync] manual sync initializing PowerSync');
    await withTimeout(
      operations.initialize(),
      options.operationTimeoutMs,
      manualSyncTimeout('initializing PowerSync'),
    );
    console.log('[powersync] manual sync connecting PowerSync');
    await withTimeout(operations.connect(), options.operationTimeoutMs, manualSyncTimeout('connecting PowerSync'));
  }

  console.log('[powersync] manual sync waiting for upload queue');
  await waitForUploadQueueToDrain(operations, options);

  if (!wasConnected) {
    console.log('[powersync] manual sync waiting for first sync');
    await withTimeout(
      operations.waitForFirstSync(),
      options.operationTimeoutMs,
      manualSyncTimeout('waiting for the first sync to finish'),
    );
  }

  console.log('[powersync] manual sync completed');
}
