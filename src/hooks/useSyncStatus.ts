import { useSyncExternalStore } from 'react';

import { useSyncStore } from '@/store/syncStore';

export function useSyncStatus(): {
  isOnline: boolean;
  phase: 'booting' | 'unauthenticated' | 'syncing' | 'ready' | 'offline' | 'degraded' | 'failed';
  lastError: string | null;
  lastErrorCode: string | null;
  lastSyncedAt: string | null;
  pendingUploadCount: number;
  failedUploadCount: number;
} {
  const snapshot = useSyncExternalStore(
    useSyncStore.subscribe,
    useSyncStore.getState,
    useSyncStore.getState,
  );

  return {
    isOnline: snapshot.isOnline,
    phase: snapshot.phase,
    lastError: snapshot.lastError,
    lastErrorCode: snapshot.lastErrorCode,
    lastSyncedAt: snapshot.lastSyncedAt,
    pendingUploadCount: snapshot.pendingUploadCount,
    failedUploadCount: snapshot.failedUploadCount,
  };
}
