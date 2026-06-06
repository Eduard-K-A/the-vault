import { db, powersync } from '@/db/powersync';
import {
  buildJoinedBusinessSummary,
  isSupabaseFunctionNotFoundError,
  isValidateJoinCodeResponse,
  mergeBusinessSummary,
  normalizeJoinCode,
  type ValidateJoinCodeResponse,
} from '@/services/joinBusinessHelpers';
import { composeBusinessSummaries } from '@/services/businessSummaryHelpers';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { Business, BusinessSummary, UserRole } from '@/types/models';
import { isValidJoinCode, isNonEmpty } from '@/utils/validators';

const attemptsByUser = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

function pruneAttempts(userId: string): number[] {
  const now = Date.now();
  const attempts = attemptsByUser.get(userId) ?? [];
  const pruned = attempts.filter((timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS);
  attemptsByUser.set(userId, pruned);
  return pruned;
}

function recordAttempt(userId: string): void {
  const attempts = pruneAttempts(userId);
  attempts.push(Date.now());
  attemptsByUser.set(userId, attempts);
}

async function validateJoinCodeRemotely(joinCode: string, userId: string): Promise<ValidateJoinCodeResponse | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const body = {
    join_code: normalizeJoinCode(joinCode),
    user_id: userId,
  };
  const { data, error } = await client.functions.invoke('validate-join-code', {
    body,
  });

  if (error && await isSupabaseFunctionNotFoundError(error)) {
    const fallback = await client.functions.invoke('rapid-service', {
      body,
    });
    if (fallback.error) {
      throw fallback.error;
    }

    return isValidateJoinCodeResponse(fallback.data) ? fallback.data : null;
  }

  if (error) {
    throw error;
  }

  return isValidateJoinCodeResponse(data) ? data : null;
}

async function validateJoinCodeLocally(joinCode: string, userId: string): Promise<Business | null> {
  const normalizedJoinCode = normalizeJoinCode(joinCode);
  if (!isValidJoinCode(normalizedJoinCode)) {
    return null;
  }

  const attempts = pruneAttempts(userId);
  if (attempts.length >= RATE_LIMIT_MAX) {
    throw new Error('Join code attempts are temporarily rate-limited.');
  }

  recordAttempt(userId);
  return (await powersync.getOptional<Business>('SELECT * FROM businesses WHERE join_code = ?', [normalizedJoinCode])) ?? null;
}

export async function validateJoinCode(joinCode: string, userId: string): Promise<Business | null> {
  return validateJoinCodeLocally(joinCode, userId);
}

export async function loadBusinessSummariesForUser(userId: string): Promise<BusinessSummary[]> {
  const memberships = await powersync.getAll<{
    business_id: string;
    business_name: string;
    role: UserRole;
    branch_id: string | null;
    branch_name: string | null;
  }>(
    `
      SELECT bm.business_id, b.name AS business_name, bm.role, bm.branch_id, br.name AS branch_name
      FROM business_members bm
      JOIN businesses b ON b.id = bm.business_id
      LEFT JOIN branches br ON br.id = bm.branch_id
      WHERE bm.user_id = ? AND bm.is_active = 1
    `,
    [userId],
  );

  const ownedBusinesses = await powersync.getAll<{
    business_id: string;
    business_name: string;
  }>(
    `
      SELECT id AS business_id, name AS business_name
      FROM businesses
      WHERE owner_id = ? AND is_active = 1
    `,
    [userId],
  );

  return composeBusinessSummaries({
    memberships,
    ownedBusinesses,
  });
}

export async function createBusiness(input: {
  name: string;
  address?: string | null;
  branchName?: string;
}): Promise<{ business: Business; summary: BusinessSummary }> {
  const auth = useAuthStore.getState();
  if (!auth.userId) {
    throw new Error('No signed-in user.');
  }

  if (!isNonEmpty(input.name)) {
    throw new Error('Business name is required.');
  }

  const business = await db.writeTransaction((tx) =>
    tx.createBusiness({
      name: input.name.trim(),
      ownerId: auth.userId,
      address: input.address ?? null,
      branchName: input.branchName?.trim() || 'Main Branch',
    } as any),
  );

  const summary: any = {
    businessId: business.id,
    businessName: business.name,
    role: 'owner',
    branchId: null,
    branchName: null,
  };

  const summaries = await loadBusinessSummariesForUser(auth.userId);
  useBusinessStore.getState().setAvailableBusinesses(summaries);
  const createdSummary = summaries.find((entry) => entry.businessId === business.id);
  if (createdSummary) {
    summary.branchId = createdSummary.branchId;
    summary.branchName = createdSummary.branchName;
  }

  return { business, summary };
}

export async function joinBusiness(input: {
  joinCode: string;
  userId: string;
  role?: UserRole;
}): Promise<BusinessSummary> {
  const role = input.role ?? 'employee';
  const remoteBusiness = await validateJoinCodeRemotely(input.joinCode, input.userId);
  const localBusiness = remoteBusiness ? null : await validateJoinCode(input.joinCode, input.userId);
  const businessId = remoteBusiness?.business_id ?? localBusiness?.id ?? null;
  if (!businessId) {
    throw new Error('Invalid join code.');
  }

  await db.writeTransaction(async (tx) => {
    await tx.addBusinessMember({
      businessId,
      userId: input.userId,
      role,
      branchId: null,
    });
  });

  await syncPowerSyncNow();

  const localSummaries = await loadBusinessSummariesForUser(input.userId);
  const summary =
    localSummaries.find((entry) => entry.businessId === businessId) ??
    (remoteBusiness ? buildJoinedBusinessSummary(remoteBusiness, role) : null);
  if (!summary) {
    throw new Error('Unable to resolve joined business.');
  }

  const nextSummaries = mergeBusinessSummary(localSummaries, summary);
  useBusinessStore.getState().setAvailableBusinesses(nextSummaries);
  return summary;
}

export async function getSelectedBusinessSummary(): Promise<BusinessSummary | null> {
  const businessId = useBusinessStore.getState().activeBusiness?.id ?? null;
  const userId = useAuthStore.getState().userId ?? null;
  if (!businessId || !userId) {
    return null;
  }

  return (await loadBusinessSummariesForUser(userId)).find((entry) => entry.businessId === businessId) ?? null;
}
