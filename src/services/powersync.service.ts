import { powersync, SupabasePowerSyncConnector } from '@/powersync';
import { runManualSyncSteps } from '@/services/powersyncManualSyncHelpers';
import { waitForManualPullConfirmation } from '@/services/powersyncPullWaitHelpers';
import { validateSyncBackend } from '@/services/syncValidation.service';
import { cleanupInvalidProducts } from '@/db/productCleanupHelpers';
import { ensureLocalSchemaCompatibility } from '@/powersync/localSchemaCompatibility';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { logPowerSyncBackground, logSyncDebug } from '@/utils/syncDebug';

let initialized = false;
let connectStreamPromise: Promise<void> | null = null;
let manualSyncPromise: Promise<void> | null = null;
let validationPromise: Promise<void> | null = null;
const MANUAL_SYNC_OPERATION_TIMEOUT_MS = 30000;
const MANUAL_SYNC_UPLOAD_QUEUE_TIMEOUT_MS = 300000;
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

function logSyncNow(message: string, details?: Record<string, unknown>, traceId?: string): void {
  if (traceId) {
    logSyncDebug(traceId, message, details);
    return;
  }

  if (details) {
    console.debug(`[sync-now] ${message}`, details);
    return;
  }

  console.debug(`[sync-now] ${message}`);
}

export async function initializePowerSync(): Promise<void> {
  if (initialized) {
    logPowerSyncBackground('initialize skipped; already initialized', getSyncNowStatusSnapshot());
    return;
  }

  initialized = true;
  logPowerSyncBackground('initializing database');
  await powersync.init();
  await ensureLocalSchemaCompatibility(powersync);
  logPowerSyncBackground('database initialized', getSyncNowStatusSnapshot());

  // Clean up products with invalid prices before syncing
  const cleanup = await cleanupInvalidProducts();
  if (cleanup.deleted > 0) {
    console.log(`[powersync] removed ${cleanup.deleted} products with invalid prices during initialization`);
  }
  logPowerSyncBackground('invalid product cleanup completed', cleanup);

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
    logPowerSyncBackground('connect already in-flight; reusing promise', getSyncNowStatusSnapshot());
    return connectStreamPromise;
  }

  connectStreamPromise = (async () => {
    const session = useAuthStore.getState();
    if (!session.accessToken) {
      logPowerSyncBackground('connect skipped; no signed-in session');
      return;
    }

    logPowerSyncBackground('connect starting', {
      userId: session.userId,
      ...getSyncNowStatusSnapshot(),
    });
    useSyncStore.getState().setPhase('syncing');
    await initializePowerSync();
    await powersync.connect(new SupabasePowerSyncConnector());
    logPowerSyncBackground('connect call completed', getSyncNowStatusSnapshot());
  })();

  try {
    await connectStreamPromise;
  } finally {
    connectStreamPromise = null;
  }
}

export async function connectPowerSync(): Promise<void> {
  logPowerSyncBackground('foreground connect requested', getSyncNowStatusSnapshot());
  await connectPowerSyncStream();
  const session = useAuthStore.getState();
  if (!session.accessToken) {
    logPowerSyncBackground('foreground connect stopped; no signed-in session');
    return;
  }

  await powersync.waitForFirstSync();
  logPowerSyncBackground('first sync completed', getSyncNowStatusSnapshot());
  useSyncStore.getState().setPhase('ready');
}

export async function disconnectPowerSync(): Promise<void> {
  if (!initialized) {
    logPowerSyncBackground('disconnect skipped; not initialized');
    return;
  }

  logPowerSyncBackground('disconnect requested', getSyncNowStatusSnapshot());
  await powersync.disconnectAndClear({ clearLocal: false });
  logPowerSyncBackground('disconnect completed', getSyncNowStatusSnapshot());
  useSyncStore.getState().setPhase('unauthenticated');
}

export async function syncPowerSyncNow(traceId?: string): Promise<void> {
  if (manualSyncPromise) {
    logSyncNow('already running; reusing in-flight sync', undefined, traceId);
    return manualSyncPromise;
  }

  manualSyncPromise = runSyncPowerSyncNow(traceId);
  try {
    await manualSyncPromise;
  } finally {
    manualSyncPromise = null;
  }
}

async function runSyncPowerSyncNow(traceId?: string): Promise<void> {
  const startedAt = Date.now();
  const session = useAuthStore.getState();
  if (!session.accessToken) {
    logSyncNow('failed before start; no signed-in session', undefined, traceId);
    throw new Error('No signed-in session available.');
  }

  logSyncNow('started', {
    userId: session.userId,
    ...getSyncNowStatusSnapshot(),
  }, traceId);
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
          }, traceId);
          return count;
        },
        pullLatestData: async () => {
          logSyncNow('pull confirmation started', getSyncNowStatusSnapshot(), traceId);
          await waitForManualPullConfirmation({
            getStatus: () => powersync.currentStatus,
            waitForFirstSync: () => powersync.waitForFirstSync(),
            waitForDownloadIdle: () => powersync.waitForStatus((status) => !status.dataFlowStatus.downloading),
            debug: (path) => {
              const messages = {
                'active-download': 'waiting for active download to become idle',
                'existing-snapshot': 'using existing synced snapshot',
                'first-sync': 'waiting for first sync snapshot',
                'fresh-sync': 'waiting for fresh sync snapshot',
              };
              logSyncNow(messages[path], getSyncNowStatusSnapshot(), traceId);
            },
          });
          logSyncNow('pull confirmation completed', getSyncNowStatusSnapshot(), traceId);
        },
      },
      {
        operationTimeoutMs: MANUAL_SYNC_OPERATION_TIMEOUT_MS,
        uploadQueueTimeoutMs: MANUAL_SYNC_UPLOAD_QUEUE_TIMEOUT_MS,
        uploadQueuePollMs: MANUAL_SYNC_POLL_MS,
      },
    );
    useSyncStore.getState().setPendingUploadCount(0);
    useSyncStore.getState().setLastSyncedAt(new Date().toISOString());
    useSyncStore.getState().setPhase('ready');
    logSyncNow('completed', {
      elapsedMs: Date.now() - startedAt,
      ...getSyncNowStatusSnapshot(),
    }, traceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manual sync failed';
    logSyncNow('failed', {
      elapsedMs: Date.now() - startedAt,
      error: message,
      ...getSyncNowStatusSnapshot(),
    }, traceId);
    console.error(`[powersync] sync error: ${message}`);
    useSyncStore.getState().setLastError(message);
    useSyncStore.getState().setPhase('failed');
    throw error;
  }
}
