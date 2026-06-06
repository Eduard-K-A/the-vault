import { offlineConfig, hasRemoteSyncConfig } from '@/config/offline';
import { applyBootstrapSnapshot } from '@/db/powersync';
import { hydrateDeviceIdentity } from '@/services/device.service';
import { shouldLoadBootstrapSnapshot } from '@/services/offlineHelpers';
import { fetchInitialBootstrapSnapshot } from '@/services/remoteApi';
import { useSyncStore } from '@/store/syncStore';
import type { AuthSession } from '@/types/models';

export async function initializeOfflineRuntime(session: AuthSession | null = null): Promise<void> {
  await hydrateDeviceIdentity();
  useSyncStore.getState().initialize();
  if (!hasRemoteSyncConfig()) {
    useSyncStore.getState().setLastError(
      'Remote sync is not configured yet. Local offline state remains available.',
    );
    return;
  }

  if (!shouldLoadBootstrapSnapshot(session)) {
    return;
  }

  const snapshot = await fetchInitialBootstrapSnapshot();
  if (snapshot) {
    await applyBootstrapSnapshot(snapshot as never);
  }
}

export function bindOfflineSession(session: AuthSession | null): void {
  if (session === null) {
    useSyncStore.getState().clearSession();
    return;
  }

  useSyncStore.getState().setSession({
    userId: session.userId,
    businessId: null,
    branchId: null,
  });

  useSyncStore.getState().setPhase('ready');
}

export function clearOfflineRuntime(): void {
  useSyncStore.getState().clearSession();
  useSyncStore.getState().setLastError(null);
}

export function getOfflineConfigSummary(): {
  appEnv: string;
  remoteSyncConfigured: boolean;
  powerSyncSchema: string;
} {
  return {
    appEnv: offlineConfig.appEnv,
    remoteSyncConfigured: hasRemoteSyncConfig(),
    powerSyncSchema: offlineConfig.powerSyncSchema,
  };
}
