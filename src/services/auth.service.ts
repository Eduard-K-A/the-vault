import * as SecureStore from 'expo-secure-store';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

import { db, powersync } from '@/db/powersync';
import { bindOfflineSession, clearOfflineRuntime, initializeOfflineRuntime } from '@/services/offline.service';
import { connectPowerSync, disconnectPowerSync, initializePowerSync } from '@/services/powersync.service';
import { loadBusinessSummariesForUser } from '@/services/business.service';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { AuthSession, UserRole } from '@/types/models';
import { isStrongPassword, isValidEmail } from '@/utils/validators';

const SESSION_KEY = 'supabase_session_v1';

interface AuthInput {
  email: string;
  password: string;
}

interface SignUpInput extends AuthInput {
  fullname: string;
  role: UserRole;
}

async function loadProfileById(userId: string) {
  return (await powersync.getOptional(
    'SELECT id, fullname, email, phone_number, avatar_url, created_at FROM profiles WHERE id = ?',
    [userId],
  )) as
    | {
        id: string;
        fullname: string;
        email: string;
        phone_number: string | null;
        avatar_url: string | null;
        created_at: string;
      }
    | null;
}

async function loadProfileByEmail(email: string) {
  return (await powersync.getOptional(
    'SELECT id, fullname, email, phone_number, avatar_url, created_at FROM profiles WHERE lower(email) = lower(?)',
    [email],
  )) as
    | {
        id: string;
        fullname: string;
        email: string;
        phone_number: string | null;
        avatar_url: string | null;
        created_at: string;
      }
    | null;
}

async function resolvePrimaryRole(userId: string): Promise<UserRole> {
  const summaries = await loadBusinessSummariesForUser(userId);
  if (summaries.some((summary) => summary.role === 'owner')) {
    return 'owner';
  }

  return summaries[0]?.role ?? 'employee';
}

function createSession(
  profileId: string,
  email: string,
  fullname: string,
  role: UserRole,
  authTokens: { accessToken: string; refreshToken: string; expiresAt: number | null },
): AuthSession {
  return {
    userId: profileId,
    email,
    fullname,
    role,
    accessToken: authTokens.accessToken,
    refreshToken: authTokens.refreshToken,
    expiresAt: authTokens.expiresAt,
  };
}

async function persistSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

async function clearPersistedSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function setSupabaseAuthSession(session: AuthSession | null): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  if (!session || !session.refreshToken) {
    return;
  }

  const { error } = await client.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  if (error) {
    throw error;
  }
}

async function upsertLocalProfile(profile: {
  id: string;
  fullname: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string;
}): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.upsertProfile(profile);
  });
}

async function setStoreSession(session: AuthSession): Promise<void> {
  await setSupabaseAuthSession(session);
  useAuthStore.getState().setSession(session);
  useBusinessStore.getState().setAvailableBusinesses(await loadBusinessSummariesForUser(session.userId));
  bindOfflineSession(session);
  await initializePowerSync();
  await connectPowerSync();
  await persistSession(session);
}

export async function hydrateSession(): Promise<void> {
  await initializeOfflineRuntime();
  await initializePowerSync();
  useAuthStore.getState().setLoading();
  const rawSession = await SecureStore.getItemAsync(SESSION_KEY);
  if (!rawSession) {
    clearOfflineRuntime();
    useAuthStore.getState().clearSession();
    useBusinessStore.getState().setAvailableBusinesses([]);
    useBusinessStore.getState().clearActiveBusiness();
    return;
  }

  try {
    const parsed = JSON.parse(rawSession) as AuthSession;
    await setSupabaseAuthSession(parsed);

    const profile =
      (await loadProfileById(parsed.userId)) ??
      ({
        id: parsed.userId,
        fullname: parsed.fullname,
        email: parsed.email,
        phone_number: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      } as const);

    if (!await loadProfileById(parsed.userId)) {
      await upsertLocalProfile(profile);
    }

    await setStoreSession({
      ...parsed,
      fullname: profile.fullname,
      email: profile.email,
      role: await resolvePrimaryRole(profile.id),
    });
  } catch {
    await clearPersistedSession();
    clearOfflineRuntime();
    useAuthStore.getState().clearSession();
  }
}

export async function signIn(input: AuthInput): Promise<AuthSession> {
  const email = input.email.trim().toLowerCase();
  if (!isStrongPassword(input.password)) {
    throw new Error('Password must be at least 8 characters.');
  }

  if (!isValidEmail(email)) {
    throw new Error('Enter a valid email address.');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) {
    throw error;
  }

  if (!data.session || !data.user) {
    throw new Error('Supabase did not return a signed-in session.');
  }

  const profile =
    (await loadProfileById(data.user.id)) ??
    ({
      id: data.user.id,
      fullname: (data.user.user_metadata?.fullname as string | undefined) ?? email,
      email: data.user.email ?? email,
      phone_number: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    } as const);
  await upsertLocalProfile(profile);

  const session = createSession(
    profile.id,
    profile.email,
    profile.fullname,
    await resolvePrimaryRole(profile.id),
    {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : null,
    },
  );
  await setStoreSession(session);
  return session;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const email = input.email.trim().toLowerCase();
  const fullname = input.fullname.trim();
  if (!isStrongPassword(input.password)) {
    throw new Error('Password must be at least 8 characters.');
  }

  if (!isValidEmail(email)) {
    throw new Error('Enter a valid email address.');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        fullname: fullname || 'New user',
        role: input.role,
      },
    },
  });
  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Supabase did not return a created user.');
  }

  const profile = {
    id: data.user.id,
    fullname: fullname || 'New user',
    email: data.user.email ?? email,
    phone_number: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
  };

  await upsertLocalProfile(profile);

  if (!data.session) {
    throw new Error('Account created. Enable email confirmations or sign in after confirming your email.');
  }

  const session = createSession(
    profile.id,
    profile.email,
    profile.fullname,
    input.role,
    {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : null,
    },
  );
  await setStoreSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
  await clearPersistedSession();
  await disconnectPowerSync();
  clearOfflineRuntime();
  useAuthStore.getState().clearSession();
  useBusinessStore.getState().clearActiveBusiness();
  useBusinessStore.getState().setAvailableBusinesses([]);
}

export async function resetPassword(email: string): Promise<void> {
  if (!email.trim()) {
    throw new Error('Email is required.');
  }
}

export async function linkBusinessMembership(input: {
  businessId: string;
  userId: string;
  role: UserRole;
  branchId?: string | null;
}): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.addBusinessMember({
      businessId: input.businessId,
      userId: input.userId,
      role: input.role,
      branchId: input.branchId ?? null,
    });
  });

  const session = useAuthStore.getState();
  if (session.userId) {
    useBusinessStore.getState().setAvailableBusinesses(await loadBusinessSummariesForUser(session.userId));
  }
}
