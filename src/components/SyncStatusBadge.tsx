import React from 'react';

import { Badge } from '@/components/ui';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncStatusBadge() {
  const { phase, isOnline, lastError, pendingUploadCount, lastSyncedAt } = useSyncStatus();

  if (phase === 'failed') {
    return <Badge label={lastError ?? 'Sync failed'} tone="danger" accessibilityLabel="Sync status" />;
  }

  if (phase === 'degraded') {
    return <Badge label={lastError ?? 'Sync degraded'} tone="warning" accessibilityLabel="Sync status" />;
  }

  if (phase === 'offline' || !isOnline) {
    return (
      <Badge
        label={pendingUploadCount > 0 ? `Offline: ${pendingUploadCount} pending` : 'Offline'}
        tone="warning"
        accessibilityLabel="Sync status"
      />
    );
  }

  if (phase === 'syncing') {
    return (
      <Badge
        label={pendingUploadCount > 0 ? `Uploading ${pendingUploadCount}` : 'Syncing'}
        tone="warning"
        accessibilityLabel="Sync status"
      />
    );
  }

  const syncedLabel = lastSyncedAt
    ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Synced';

  return (
    <Badge
      label={phase === 'ready' ? syncedLabel : 'Syncing'}
      tone={phase === 'ready' ? 'success' : 'warning'}
      accessibilityLabel="Sync status"
    />
  );
}
