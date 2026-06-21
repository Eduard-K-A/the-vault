import { render, screen } from '@testing-library/react-native';

import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useSyncStore } from '@/store/syncStore';
import { resetAllStores } from '../helpers/resetStores';

describe('SyncStatusBadge', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('renders syncing state', async () => {
    useSyncStore.setState({ phase: 'syncing', pendingUploadCount: 0 });

    await render(<SyncStatusBadge />);

    expect(screen.getByText('Syncing...')).toBeTruthy();
  });

  it('renders synced state', async () => {
    useSyncStore.setState({ phase: 'ready', lastSyncedAt: null });

    await render(<SyncStatusBadge />);

    expect(screen.getByText('Synced')).toBeTruthy();
  });

  it('renders offline state', async () => {
    useSyncStore.setState({ phase: 'offline', isOnline: false, pendingUploadCount: 0 });

    await render(<SyncStatusBadge />);

    expect(screen.getByText('Offline')).toBeTruthy();
  });

  it('renders offline pending upload count', async () => {
    useSyncStore.setState({ phase: 'offline', isOnline: false, pendingUploadCount: 2 });

    await render(<SyncStatusBadge />);

    expect(screen.getByText('Offline - 2 queued')).toBeTruthy();
  });

  it('renders failed last error', async () => {
    useSyncStore.setState({ phase: 'failed', lastError: 'Could not upload sales' });

    await render(<SyncStatusBadge />);

    expect(screen.getByText('Sync failed')).toBeTruthy();
  });

  it('renders degraded last error', async () => {
    useSyncStore.setState({ phase: 'degraded', lastError: 'Pull delayed' });

    await render(<SyncStatusBadge />);

    expect(screen.getByText('Pull delayed')).toBeTruthy();
  });

  it('exposes the sync status accessibility label', async () => {
    useSyncStore.setState({ phase: 'ready' });

    await render(<SyncStatusBadge />);

    expect(screen.getByLabelText('Sync status')).toBeTruthy();
  });
});
