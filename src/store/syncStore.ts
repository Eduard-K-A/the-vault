import { create } from 'zustand';

import { offlineConfig } from '@/config/offline';
import type { SyncPhase, SyncSessionSnapshot } from '@/types/sync';

interface SyncState {
  phase: SyncPhase;
  isOnline: boolean;
  remoteSyncConfigured: boolean;
  lastError: string | null;
  lastErrorCode: string | null;
  lastSyncedAt: string | null;
  pendingUploadCount: number;
  failedUploadCount: number;
  session: SyncSessionSnapshot;
  initialize: () => void;
  setPhase: (phase: SyncPhase) => void;
  setOnline: (isOnline: boolean) => void;
  setSession: (session: SyncSessionSnapshot) => void;
  clearSession: () => void;
  setLastError: (message: string | null) => void;
  setLastErrorCode: (code: string | null) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
  setPendingUploadCount: (count: number) => void;
  setFailedUploadCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  phase: 'booting',
  isOnline: true,
  remoteSyncConfigured: false,
  lastError: null,
  lastErrorCode: null,
  lastSyncedAt: null,
  pendingUploadCount: 0,
  failedUploadCount: 0,
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
      lastErrorCode: null,
      pendingUploadCount: 0,
      failedUploadCount: 0,
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
      lastErrorCode: null,
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
      lastErrorCode: null,
      pendingUploadCount: 0,
      failedUploadCount: 0,
      lastSyncedAt: null,
    });
  },
  setLastError: (message) => {
    set({ lastError: message });
  },
  setLastErrorCode: (code) => {
    set({ lastErrorCode: code });
  },
  setLastSyncedAt: (timestamp) => {
    set({ lastSyncedAt: timestamp });
  },
  setPendingUploadCount: (count) => {
    set({ pendingUploadCount: Math.max(0, count) });
  },
  setFailedUploadCount: (count) => {
    set({ failedUploadCount: Math.max(0, count) });
  },
}));
