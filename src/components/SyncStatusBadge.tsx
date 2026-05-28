import React from 'react';

import { Badge } from '@/components/ui';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncStatusBadge() {
  const { pendingCount } = useSyncStatus();

  if (pendingCount === 0) {
    return <Badge label="Synced" tone="success" />;
  }

  return <Badge label={`${pendingCount} queued`} tone="warning" />;
}
