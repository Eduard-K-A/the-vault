import React from 'react';

import { Badge } from '@/components/ui';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncStatusBadge() {
  const { phase, isOnline, lastError, pendingUploadCount, lastSyncedAt } = useSyncStatus();

  if (phase === 'failed') {
    return (
      <Badge
        label="Sync failed"
        tone="danger"
        accessibilityLabel="Sync status"
        testID="sync-status"
      />
    );
  }

  if (phase === 'degraded') {
    return (
      <Badge
        label={lastError ?? 'Sync failed'}
        tone="warning"
        accessibilityLabel="Sync status"
        testID="sync-status"
      />
    );
  }

  if (phase === 'offline' || !isOnline) {
    return (
      <Badge
        label={pendingUploadCount > 0 ? `Offline - ${pendingUploadCount} queued` : 'Offline'}
        tone="warning"
        accessibilityLabel="Sync status"
        testID="sync-status"
      />
    );
  }

  if (phase === 'syncing') {
    return (
      <Badge
        label="Syncing..."
        tone="accent"
        accessibilityLabel="Sync status"
        testID="sync-status"
      />
    );
  }

  const syncedLabel = lastSyncedAt
    ? `Synced ${formatRelativeSyncTime(lastSyncedAt)}`
    : 'Synced';

  return (
    <Badge
      label={phase === 'ready' ? syncedLabel : 'Syncing'}
      tone={phase === 'ready' ? 'success' : 'warning'}
      accessibilityLabel="Sync status"
      testID="sync-status"
    />
  );
}

function formatRelativeSyncTime(value: string): string {
  const elapsedMs = Date.now() - new Date(value).getTime();
  const elapsedMinutes = Math.max(0, Math.round(elapsedMs / 60000));

  if (elapsedMinutes < 1) {
    return 'just now';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  return `${elapsedHours}h ago`;
}
