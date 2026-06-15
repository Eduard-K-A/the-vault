import { hydrateSession, signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { getItemAsync, setSecureStoreItem } from '../__mocks__/expoModules';
import { mockSupabaseClient } from '../__mocks__/supabase';
import { resetAllStores } from '../helpers/resetStores';

jest.mock('@/services/authBusinessHydration', () => ({
  hydrateAvailableBusinessesForUser: jest.fn(async () => []),
}));

jest.mock('@/services/business.service', () => ({
  loadBusinessSummariesForUser: jest.fn(async () => []),
}));

jest.mock('@/services/offline.service', () => ({
  bindOfflineSession: jest.fn(),
  clearOfflineRuntime: jest.fn(),
  initializeOfflineRuntime: jest.fn(async () => undefined),
}));

jest.mock('@/services/powersync.service', () => ({
  connectPowerSync: jest.fn(async () => undefined),
  disconnectPowerSync: jest.fn(async () => undefined),
  initializePowerSync: jest.fn(async () => undefined),
}));

jest.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: () => require('../__mocks__/supabase').mockSupabaseClient,
}));

describe('authStore and auth service', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('applies auth status transitions through store actions', () => {
    useAuthStore.getState().setSession({
      userId: 'user-1',
      email: 'user@example.com',
      fullname: 'Test User',
      role: 'employee',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: null,
    });
    expect(useAuthStore.getState()).toEqual(
      expect.objectContaining({
        status: 'signed_in',
        userId: 'user-1',
        email: 'user@example.com',
        error: null,
      }),
    );

    useAuthStore.getState().setLoading();
    expect(useAuthStore.getState().status).toBe('loading');

    useAuthStore.getState().setError('Unable to sign in');
    expect(useAuthStore.getState().error).toBe('Unable to sign in');

    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState()).toEqual(
      expect.objectContaining({
        status: 'signed_out',
        userId: null,
        accessToken: null,
        error: null,
      }),
    );
  });

  it('sets signed_out when hydrateSession finds no stored session', async () => {
    await hydrateSession();

    expect(getItemAsync).toHaveBeenCalledWith('supabase_session_v1');
    expect(useAuthStore.getState()).toEqual(
      expect.objectContaining({
        status: 'signed_out',
        userId: null,
        accessToken: null,
      }),
    );
  });

  it('signOut calls Supabase and clears the persisted session', async () => {
    setSecureStoreItem('supabase_session_v1', '{"userId":"user-1"}');
    useAuthStore.getState().setSession({
      userId: 'user-1',
      email: 'user@example.com',
      fullname: 'Test User',
      role: 'employee',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: null,
    });

    await signOut();

    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe('signed_out');
    expect(await getItemAsync('supabase_session_v1')).toBeNull();
  });
});
