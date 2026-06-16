jest.mock('@/db/productCleanupHelpers', () => ({
  cleanupInvalidProducts: jest.fn(async () => ({ deleted: 0 })),
}));

jest.mock('@/services/syncValidation.service', () => ({
  validateSyncBackend: jest.fn(async () => undefined),
}));

const { syncPowerSyncNow } = require('@/services/powersync.service') as typeof import('@/services/powersync.service');
const { useAuthStore } = require('@/store/authStore') as typeof import('@/store/authStore');
const { useSyncStore } = require('@/store/syncStore') as typeof import('@/store/syncStore');
const { mockPowerSyncDatabase, setPowerSyncUploadQueueCount } = require('../__mocks__/powersync') as typeof import('../__mocks__/powersync');
const { resetAllStores } = require('../helpers/resetStores') as typeof import('../helpers/resetStores');

describe('syncStore and manual sync service', () => {
  beforeEach(() => {
    resetAllStores();
    mockPowerSyncDatabase.getUploadQueueStats.mockClear();
    jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    useAuthStore.getState().setSession({
      userId: 'user-1',
      email: 'user@example.com',
      fullname: 'Test User',
      role: 'employee',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts with the reset initial sync state', () => {
    expect(useSyncStore.getState()).toEqual(
      expect.objectContaining({
        phase: 'booting',
        isOnline: true,
        pendingUploadCount: 0,
        session: {
          userId: null,
          businessId: null,
          branchId: null,
        },
      }),
    );
  });

  it('setOnline(false) moves phase to offline', () => {
    useSyncStore.getState().setPhase('ready');

    useSyncStore.getState().setOnline(false);

    expect(useSyncStore.getState()).toEqual(expect.objectContaining({ isOnline: false, phase: 'offline' }));
  });

  it('setPendingUploadCount(-1) stores zero', () => {
    useSyncStore.getState().setPendingUploadCount(-1);

    expect(useSyncStore.getState().pendingUploadCount).toBe(0);
  });

  it('clearSession moves phase to unauthenticated', () => {
    useSyncStore.getState().setSession({ userId: 'user-1', businessId: 'business-1', branchId: 'branch-1' });

    useSyncStore.getState().clearSession();

    expect(useSyncStore.getState()).toEqual(
      expect.objectContaining({
        phase: 'unauthenticated',
        pendingUploadCount: 0,
        session: { userId: null, businessId: null, branchId: null },
      }),
    );
  });

  it('syncPowerSyncNow uses upload queue stats and sets ready on success', async () => {
    setPowerSyncUploadQueueCount(0);

    await syncPowerSyncNow();

    expect(mockPowerSyncDatabase.getUploadQueueStats).toHaveBeenCalledTimes(1);
    expect(useSyncStore.getState().phase).toBe('ready');
    expect(useSyncStore.getState().pendingUploadCount).toBe(0);
    expect(useSyncStore.getState().lastSyncedAt).toEqual(expect.any(String));
  });

  it('duplicate concurrent syncPowerSyncNow calls reuse one in-flight operation', async () => {
    let releaseQueueStats: () => void = () => undefined;
    let queueStatsStarted = false;
    mockPowerSyncDatabase.getUploadQueueStats.mockImplementationOnce(
      async () =>
        new Promise<{ count: number }>((resolve) => {
          queueStatsStarted = true;
          releaseQueueStats = () => resolve({ count: 0 });
        }),
    );

    const first = syncPowerSyncNow();
    const second = syncPowerSyncNow();
    await waitFor(() => queueStatsStarted);
    releaseQueueStats();
    await Promise.all([first, second]);

    expect(mockPowerSyncDatabase.getUploadQueueStats).toHaveBeenCalledTimes(1);
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  while (!predicate()) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
