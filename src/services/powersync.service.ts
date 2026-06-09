import { powersync, SupabasePowerSyncConnector } from '@/powersync';
import { runManualSyncSteps } from '@/services/powersyncManualSyncHelpers';
import { waitForManualPullConfirmation } from '@/services/powersyncPullWaitHelpers';
import { validateSyncBackend } from '@/services/syncValidation.service';
import { cleanupInvalidProducts } from '@/db/productCleanupHelpers';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

let initialized = false;
let connectStreamPromise: Promise<void> | null = null;
let manualSyncPromise: Promise<void> | null = null;
let validationPromise: Promise<void> | null = null;
const MANUAL_SYNC_TIMEOUT_MS = 20000;
const MANUAL_SYNC_POLL_MS = 500;

function getSyncNowStatusSnapshot() {
  const status = powersync.currentStatus;
  const downloadError = status?.dataFlowStatus?.downloadError as Error | { message?: string } | string | null | undefined;
  const downloadErrorMessage =
    downloadError instanceof Error
      ? downloadError.message
      : typeof downloadError === 'string'
        ? downloadError
        : downloadError?.message ?? null;
  return {
    connected: powersync.connected,
    connecting: powersync.connecting,
    hasSynced: status?.hasSynced === true,
    lastSyncedAt: status?.lastSyncedAt?.toISOString?.() ?? status?.lastSyncedAt ?? null,
    downloading: status?.dataFlowStatus?.downloading === true,
    uploading: status?.dataFlowStatus?.uploading === true,
    downloadError: downloadErrorMessage,
  };
}

function logSyncNow(message: string, details?: Record<string, unknown>): void {
  if (details) {
    console.debug(`[sync-now] ${message}`, details);
    return;
  }

  console.debug(`[sync-now] ${message}`);
}

export async function initializePowerSync(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;
  await powersync.init();

  // Clean up products with invalid prices before syncing
  const cleanup = await cleanupInvalidProducts();
  if (cleanup.deleted > 0) {
    console.log(`[powersync] removed ${cleanup.deleted} products with invalid prices during initialization`);
  }

  if (!validationPromise) {
    validationPromise = validateSyncBackend()
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'PowerSync backend validation failed';
        console.warn(message);
        useSyncStore.getState().setLastError(message);
        useSyncStore.getState().setPhase('degraded');
      })
      .finally(() => {
        validationPromise = null;
      });
  }
  await validationPromise;
}

async function connectPowerSyncStream(): Promise<void> {
  if (connectStreamPromise) {
    return connectStreamPromise;
  }

  connectStreamPromise = (async () => {
    const session = useAuthStore.getState();
    if (!session.accessToken) {
      return;
    }

    useSyncStore.getState().setPhase('syncing');
    await initializePowerSync();
    await powersync.connect(new SupabasePowerSyncConnector());
    logSyncNow('connect call completed', getSyncNowStatusSnapshot());
  })();

  try {
    await connectStreamPromise;
  } finally {
    connectStreamPromise = null;
  }
}

export async function connectPowerSync(): Promise<void> {
  await connectPowerSyncStream();
  const session = useAuthStore.getState();
  if (!session.accessToken) {
    return;
  }

  await powersync.waitForFirstSync();
  useSyncStore.getState().setPhase('ready');
}

export async function disconnectPowerSync(): Promise<void> {
  if (!initialized) {
    return;
  }

  await powersync.disconnectAndClear({ clearLocal: false });
  useSyncStore.getState().setPhase('unauthenticated');
}

export async function syncPowerSyncNow(): Promise<void> {
  if (manualSyncPromise) {
    logSyncNow('already running; reusing in-flight sync');
    return manualSyncPromise;
  }

  manualSyncPromise = runSyncPowerSyncNow();
  try {
    await manualSyncPromise;
  } finally {
    manualSyncPromise = null;
  }
}

async function runSyncPowerSyncNow(): Promise<void> {
  const startedAt = Date.now();
  const session = useAuthStore.getState();
  if (!session.accessToken) {
    logSyncNow('failed before start; no signed-in session');
    throw new Error('No signed-in session available.');
  }

  logSyncNow('started', getSyncNowStatusSnapshot());
  useSyncStore.getState().setPhase('syncing');
  try {
    await runManualSyncSteps(
      {
        isConnected: () => powersync.connected,
        disconnect: () => powersync.disconnect(),
        initialize: initializePowerSync,
        connect: connectPowerSyncStream,
        getUploadQueueCount: async () => {
          const count = (await powersync.getUploadQueueStats()).count;
          useSyncStore.getState().setPendingUploadCount(count);
          logSyncNow('upload queue checked', {
            pendingUploads: count,
            ...getSyncNowStatusSnapshot(),
          });
          return count;
        },
        pullLatestData: async () => {
          logSyncNow('pull confirmation started', getSyncNowStatusSnapshot());
          await waitForManualPullConfirmation({
            getStatus: () => powersync.currentStatus,
            waitForFirstSync: () => powersync.waitForFirstSync(),
            waitForDownloadIdle: () => powersync.waitForStatus((status) => !status.dataFlowStatus.downloading),
            debug: (path) => {
              const messages = {
                'active-download': 'waiting for active download to become idle',
                'existing-snapshot': 'using existing synced snapshot',
                'first-sync': 'waiting for first sync snapshot',
              };
              logSyncNow(messages[path], getSyncNowStatusSnapshot());
            },
          });
          logSyncNow('pull confirmation completed', getSyncNowStatusSnapshot());
        },
      },
      {
        operationTimeoutMs: MANUAL_SYNC_TIMEOUT_MS,
        uploadQueueTimeoutMs: MANUAL_SYNC_TIMEOUT_MS,
        uploadQueuePollMs: MANUAL_SYNC_POLL_MS,
      },
    );
    useSyncStore.getState().setPendingUploadCount(0);
    useSyncStore.getState().setLastSyncedAt(new Date().toISOString());
    useSyncStore.getState().setPhase('ready');
    logSyncNow('completed', {
      elapsedMs: Date.now() - startedAt,
      ...getSyncNowStatusSnapshot(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manual sync failed';
    logSyncNow('failed', {
      elapsedMs: Date.now() - startedAt,
      error: message,
      ...getSyncNowStatusSnapshot(),
    });
    console.error(`[powersync] sync error: ${message}`);
    useSyncStore.getState().setLastError(message);
    useSyncStore.getState().setPhase('failed');
    throw error;
  }
}
