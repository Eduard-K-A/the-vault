import { powersync, SupabasePowerSyncConnector } from '@/powersync';
import { runManualSyncSteps } from '@/services/powersyncManualSyncHelpers';
import { validateSyncBackend } from '@/services/syncValidation.service';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

let initialized = false;
let connectPromise: Promise<void> | null = null;
let validationPromise: Promise<void> | null = null;
const MANUAL_SYNC_TIMEOUT_MS = 20000;
const MANUAL_SYNC_POLL_MS = 500;

export async function initializePowerSync(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;
  await powersync.init();
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

export async function connectPowerSync(): Promise<void> {
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    const session = useAuthStore.getState();
    if (!session.accessToken) {
      return;
    }

    useSyncStore.getState().setPhase('syncing');
    await initializePowerSync();
    await powersync.connect(new SupabasePowerSyncConnector());
    await powersync.waitForFirstSync();
    useSyncStore.getState().setPhase('ready');
  })();

  try {
    await connectPromise;
  } finally {
    connectPromise = null;
  }
}

export async function disconnectPowerSync(): Promise<void> {
  if (!initialized) {
    return;
  }

  await powersync.disconnectAndClear({ clearLocal: false });
  useSyncStore.getState().setPhase('unauthenticated');
}

export async function syncPowerSyncNow(): Promise<void> {
  const session = useAuthStore.getState();
  if (!session.accessToken) {
    throw new Error('No signed-in session available.');
  }

  useSyncStore.getState().setPhase('syncing');
  try {
    await runManualSyncSteps(
      {
        isConnected: () => powersync.connected,
        disconnect: () => powersync.disconnect(),
        initialize: initializePowerSync,
        connect: () => powersync.connect(new SupabasePowerSyncConnector()),
        waitForFirstSync: () => powersync.waitForFirstSync(),
        getUploadQueueCount: async () => (await powersync.getUploadQueueStats()).count,
      },
      {
        operationTimeoutMs: MANUAL_SYNC_TIMEOUT_MS,
        uploadQueueTimeoutMs: MANUAL_SYNC_TIMEOUT_MS,
        uploadQueuePollMs: MANUAL_SYNC_POLL_MS,
      },
    );
    useSyncStore.getState().setPhase('ready');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manual sync failed';
    useSyncStore.getState().setLastError(message);
    useSyncStore.getState().setPhase('failed');
    throw error;
  }
}
