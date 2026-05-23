import { create } from 'zustand';

import type { AuthSession, UserRole } from '@/types/models';

export type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  fullname: string | null;
  role: UserRole | null;
  accessToken: string | null;
  error: string | null;
  setLoading: () => void;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  setError: (message: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  userId: null,
  email: null,
  fullname: null,
  role: null,
  accessToken: null,
  error: null,
  setLoading: () => {
    set({ status: 'loading', error: null });
  },
  setSession: (session) => {
    set({
      status: 'signed_in',
      userId: session.userId,
      email: session.email,
      fullname: session.fullname,
      role: session.role,
      accessToken: session.accessToken,
      error: null,
    });
  },
  clearSession: () => {
    set({
      status: 'signed_out',
      userId: null,
      email: null,
      fullname: null,
      role: null,
      accessToken: null,
      error: null,
    });
  },
  setError: (message) => {
    set({ error: message });
  },
}));

