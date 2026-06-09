import { create } from 'zustand';

import { offlineConfig } from '@/config/offline';
import type { SyncPhase, SyncSessionSnapshot } from '@/types/sync';

interface SyncState {
  phase: SyncPhase;
  isOnline: boolean;
  remoteSyncConfigured: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  pendingUploadCount: number;
  session: SyncSessionSnapshot;
  initialize: () => void;
  setPhase: (phase: SyncPhase) => void;
  setOnline: (isOnline: boolean) => void;
  setSession: (session: SyncSessionSnapshot) => void;
  clearSession: () => void;
  setLastError: (message: string | null) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
  setPendingUploadCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  phase: 'booting',
  isOnline: true,
  remoteSyncConfigured: false,
  lastError: null,
  lastSyncedAt: null,
  pendingUploadCount: 0,
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
      pendingUploadCount: 0,
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
      pendingUploadCount: 0,
      lastSyncedAt: null,
    });
  },
  setLastError: (message) => {
    set({ lastError: message });
  },
  setLastSyncedAt: (timestamp) => {
    set({ lastSyncedAt: timestamp });
  },
  setPendingUploadCount: (count) => {
    set({ pendingUploadCount: Math.max(0, count) });
  },
}));
