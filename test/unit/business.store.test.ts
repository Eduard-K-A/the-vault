import type { BusinessSummary } from '@/types/models';

function loadBusinessStoreWithMocks() {
  jest.resetModules();

  const refreshBusinessDataFromDatabase = jest.fn(async () => undefined);
  const syncPowerSyncNow = jest.fn(async () => undefined);

  jest.doMock('@/services/businessDataRefresh.service', () => ({
    refreshBusinessDataFromDatabase,
  }));
  jest.doMock('@/services/powersync.service', () => ({
    syncPowerSyncNow,
  }));

  return {
    refreshBusinessDataFromDatabase,
    syncPowerSyncNow,
    useAuthStore: require('@/store/authStore').useAuthStore as typeof import('@/store/authStore').useAuthStore,
    useBusinessStore: require('@/store/businessStore').useBusinessStore as typeof import('@/store/businessStore').useBusinessStore,
    useSyncStore: require('@/store/syncStore').useSyncStore as typeof import('@/store/syncStore').useSyncStore,
  };
}

describe('businessStore', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('selects a newly joined business from the supplied summary before local rows are hydrated', async () => {
    const {
      refreshBusinessDataFromDatabase,
      useAuthStore,
      useBusinessStore,
      useSyncStore,
    } = loadBusinessStoreWithMocks();
    const joinedSummary: BusinessSummary = {
      businessId: 'business-1',
      businessName: 'Northwind Market',
      role: 'employee',
      branchId: null,
      branchName: null,
    };

    useAuthStore.setState({
      status: 'signed_in',
      userId: 'employee-1',
      email: 'employee@example.com',
      fullname: 'Employee One',
      role: 'employee',
      accessToken: 'access-token',
      error: null,
    });

    let releaseHydration: (() => void) | null = null;
    refreshBusinessDataFromDatabase.mockImplementationOnce(
      async () =>
        new Promise<void>((resolve) => {
          releaseHydration = resolve;
        }),
    );

    const selection = useBusinessStore.getState().selectBusiness('business-1', joinedSummary);
    await waitFor(() => refreshBusinessDataFromDatabase.mock.calls.length > 0);

    expect(useBusinessStore.getState().activeBusiness).toEqual(
      expect.objectContaining({
        id: 'business-1',
        name: 'Northwind Market',
      }),
    );
    expect(useSyncStore.getState().session).toEqual({
      userId: 'employee-1',
      businessId: 'business-1',
      branchId: null,
    });

    releaseHydration?.();
    await selection;
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > 1000) {
      throw new Error('Timed out waiting for condition.');
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
