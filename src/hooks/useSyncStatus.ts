import { useSyncExternalStore } from 'react';

import { getUnsyncedSalesCount, getVersion, subscribe } from '@/db/localDb';

export function useSyncStatus(): {
  pendingCount: number;
  hasPendingWrites: boolean;
  isOnline: boolean;
} {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const pendingCount = getUnsyncedSalesCount();
  return {
    pendingCount,
    hasPendingWrites: pendingCount > 0,
    isOnline: true,
  };
}

