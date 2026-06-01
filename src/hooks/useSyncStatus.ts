import { useSyncExternalStore } from 'react';

import { useSyncStore } from '@/store/syncStore';

export function useSyncStatus(): {
  isOnline: boolean;
  phase: 'booting' | 'unauthenticated' | 'syncing' | 'ready' | 'offline' | 'degraded' | 'failed';
  lastError: string | null;
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
  };
}
