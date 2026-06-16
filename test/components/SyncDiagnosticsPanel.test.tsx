import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { SyncDiagnosticsPanel } from '@/components/SyncDiagnosticsPanel';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSyncStore } from '@/store/syncStore';
import { createBranch, createBusiness } from '../factories/models';

describe('SyncDiagnosticsPanel', () => {
  it('shows sync, auth, business, and failure diagnostics', async () => {
    const business = createBusiness({ id: 'business-1', name: 'Main Store' });
    const branch = createBranch({ id: 'branch-1', business_id: business.id, name: 'Downtown' });

    useAuthStore.setState({
      status: 'signed_in',
      userId: 'user-1',
      email: 'user@example.com',
      fullname: 'User One',
      role: 'owner',
      accessToken: 'secret-token',
      error: null,
    });
    useBusinessStore.setState({
      activeBusiness: business,
      activeBranch: branch,
      availableBusinesses: [],
    });
    useSyncStore.setState({
      phase: 'degraded',
      isOnline: true,
      pendingUploadCount: 3,
      failedUploadCount: 1,
      lastErrorCode: 'validation_failed',
      lastError: 'Payment total does not match sale total',
      lastSyncedAt: '2026-06-15T10:00:00.000Z',
    });

    await render(React.createElement(SyncDiagnosticsPanel));

    expect(screen.getByText('Sync diagnostics')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('validation_failed')).toBeTruthy();
    expect(screen.getByText('Payment total does not match sale total')).toBeTruthy();
    expect(screen.getByText('signed_in')).toBeTruthy();
    expect(screen.getByText('Main Store')).toBeTruthy();
    expect(screen.getByText('Downtown')).toBeTruthy();
    expect(screen.queryByText('secret-token')).toBeNull();
  });
});
