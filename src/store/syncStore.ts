import { create } from 'zustand';

import { offlineConfig } from '@/config/offline';
import type { SyncPhase, SyncSessionSnapshot } from '@/types/sync';

interface SyncState {
  phase: SyncPhase;
  isOnline: boolean;
  remoteSyncConfigured: boolean;
  lastError: string | null;
  session: SyncSessionSnapshot;
  initialize: () => void;
  setPhase: (phase: SyncPhase) => void;
  setOnline: (isOnline: boolean) => void;
  setSession: (session: SyncSessionSnapshot) => void;
  clearSession: () => void;
  setLastError: (message: string | null) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  phase: 'booting',
  isOnline: true,
  remoteSyncConfigured: false,
  lastError: null,
  session: {
    userId: null,
    businessId: null,
    branchId: null,
  },
  initialize: () => {
    set({
      remoteSyncConfigured: Boolean(
        offlineConfig.supabaseUrl && offlineConfig.supabaseAnonKey && offlineConfig.powerSyncUrl,
      ),
      phase: 'booting',
      lastError: null,
    });
  },
  setPhase: (phase) => {
    set({ phase });
  },
  setOnline: (isOnline) => {
    set({ isOnline, phase: isOnline ? get().phase : 'offline' });
  },
  setSession: (session) => {
    set({
      session,
      phase: 'syncing',
      lastError: null,
    });
  },
  clearSession: () => {
    set({
      session: {
        userId: null,
        businessId: null,
        branchId: null,
      },
      phase: 'unauthenticated',
      lastError: null,
    });
  },
  setLastError: (message) => {
    set({ lastError: message });
  },
}));
