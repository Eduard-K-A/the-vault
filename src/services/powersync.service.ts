import { powersync, SupabasePowerSyncConnector } from '@/powersync';
import { validateSyncBackend } from '@/services/syncValidation.service';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

let initialized = false;
let connectPromise: Promise<void> | null = null;
let validationPromise: Promise<void> | null = null;

export async function initializePowerSync(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;
  await powersync.init();
  if (!validationPromise) {
    validationPromise = validateSyncBackend().finally(() => {
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

  await powersync.disconnectAndClear({ clearLocal: true });
  useSyncStore.getState().setPhase('unauthenticated');
}
