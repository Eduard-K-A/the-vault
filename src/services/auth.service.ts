import * as SecureStore from 'expo-secure-store';

import { db } from '@/db/powersync';
import {
  addBusinessMember,
  findProfileByEmail,
  findProfileById,
  getBusinessSummariesForUser,
  getLocalDbState,
  upsertProfile,
} from '@/db/localDb';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { AuthSession, UserRole } from '@/types/models';
import { generateUUID } from '@/utils/generateUUID';
import { isStrongPassword } from '@/utils/validators';

const SESSION_KEY = 'supabase_session_v1';

interface AuthInput {
  email: string;
  password: string;
}

interface SignUpInput extends AuthInput {
  fullname: string;
  role: UserRole;
}

function resolvePrimaryRole(userId: string): UserRole {
  const state = getLocalDbState();
  const ownedBusiness = state.businesses.find((business) => business.owner_id === userId);
  if (ownedBusiness) {
    return 'owner';
  }

  const membership = state.businessMembers.find((entry) => entry.user_id === userId);
  return membership?.role ?? 'employee';
}

function createSession(profileId: string, email: string, fullname: string, role: UserRole): AuthSession {
  return {
    userId: profileId,
    email,
    fullname,
    role,
    accessToken: generateUUID(),
  };
}

async function persistSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

async function clearPersistedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function setStoreSession(session: AuthSession): Promise<void> {
  useAuthStore.getState().setSession(session);
  const businesses = getBusinessSummariesForUser(session.userId);
  useBusinessStore.getState().setAvailableBusinesses(businesses);

  await persistSession(session);
}

export async function hydrateSession(): Promise<void> {
  useAuthStore.getState().setLoading();
  const rawSession = await SecureStore.getItemAsync(SESSION_KEY);
  if (!rawSession) {
    useAuthStore.getState().clearSession();
    useBusinessStore.getState().setAvailableBusinesses([]);
    useBusinessStore.getState().clearActiveBusiness();
    return;
  }

  try {
    const parsed = JSON.parse(rawSession) as AuthSession;
    const profile = findProfileById(parsed.userId);
    if (!profile) {
      await clearPersistedSession();
      useAuthStore.getState().clearSession();
      return;
    }

    await setStoreSession({
      ...parsed,
      fullname: profile.fullname,
      email: profile.email,
      role: resolvePrimaryRole(profile.id),
    });
  } catch {
    await clearPersistedSession();
    useAuthStore.getState().clearSession();
  }
}

export async function signIn(input: AuthInput): Promise<AuthSession> {
  if (!isStrongPassword(input.password)) {
    throw new Error('Password must be at least 8 characters.');
  }

  const profile = findProfileByEmail(input.email);
  if (!profile) {
    throw new Error('No account found for this email.');
  }

  const session = createSession(profile.id, profile.email, profile.fullname, resolvePrimaryRole(profile.id));
  await setStoreSession(session);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  if (!isStrongPassword(input.password)) {
    throw new Error('Password must be at least 8 characters.');
  }

  const existing = findProfileByEmail(input.email);
  const profileId = existing?.id ?? generateUUID();
  const profile = {
    id: profileId,
    fullname: input.fullname,
    email: input.email,
    avatar_url: existing?.avatar_url ?? null,
    created_at: existing?.created_at ?? new Date().toISOString(),
  };

  upsertProfile(profile);
  const session = createSession(profileId, profile.email, profile.fullname, input.role);
  await setStoreSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await clearPersistedSession();
  useAuthStore.getState().clearSession();
  useBusinessStore.getState().clearActiveBusiness();
  useBusinessStore.getState().setAvailableBusinesses([]);
}

export async function resetPassword(email: string): Promise<void> {
  if (!email.trim()) {
    throw new Error('Email is required.');
  }
  return;
}

export async function linkBusinessMembership(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  branchId?: string | null;
}): Promise<void> {
  await db.writeTransaction(async (tx) => {
    tx.addBusinessMember({
      businessId: input.businessId,
      userId: input.userId,
      role: input.role,
      branchId: input.branchId ?? null,
    });
  });

  const session = useAuthStore.getState();
  if (session.userId) {
    useBusinessStore.getState().setAvailableBusinesses(getBusinessSummariesForUser(session.userId));
  }
}
