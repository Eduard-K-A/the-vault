import { powersync, SupabasePowerSyncConnector } from '@/powersync';
import { validateSyncBackend } from '@/services/syncValidation.service';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

let initialized = false;
let connectPromise: Promise<void> | null = null;
let validationPromise: Promise<void> | null = null;
const MANUAL_SYNC_TIMEOUT_MS = 20000;
const MANUAL_SYNC_POLL_MS = 500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
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
    if (powersync.connected) {
      await powersync.disconnect();
    }

    await initializePowerSync();
    await powersync.connect(new SupabasePowerSyncConnector());
    await withTimeout(
      (async () => {
        const deadline = Date.now() + MANUAL_SYNC_TIMEOUT_MS;
        for (;;) {
          const queueStats = await powersync.getUploadQueueStats();
          if (queueStats.count === 0) {
            return;
          }

          if (Date.now() >= deadline) {
            throw new Error('Manual sync timed out.');
          }

          await new Promise((resolve) => setTimeout(resolve, MANUAL_SYNC_POLL_MS));
        }
      })(),
      MANUAL_SYNC_TIMEOUT_MS + 1000,
      'Manual sync timed out.',
    );

    if (powersync.connected) {
      await powersync.disconnect();
    }
    await powersync.connect(new SupabasePowerSyncConnector());
    await powersync.waitForFirstSync();
    useSyncStore.getState().setPhase('ready');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manual sync failed';
    useSyncStore.getState().setLastError(message);
    useSyncStore.getState().setPhase('failed');
    throw error;
  }
}
