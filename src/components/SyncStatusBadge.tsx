import React from 'react';

import { Badge } from '@/components/ui';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncStatusBadge() {
  const { phase, isOnline, lastError } = useSyncStatus();

  if (phase === 'failed') {
    return <Badge label={lastError ?? 'Sync failed'} tone="danger" />;
  }

  if (phase === 'degraded') {
    return <Badge label={lastError ?? 'Sync degraded'} tone="warning" />;
  }

  if (phase === 'offline' || !isOnline) {
    return <Badge label="Offline" tone="warning" />;
  }

  return <Badge label={phase === 'ready' ? 'Synced' : 'Syncing'} tone={phase === 'ready' ? 'success' : 'warning'} />;
}
