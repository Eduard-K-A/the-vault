import { db, powersync } from '@/db/powersync';
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

export async function validateJoinCode(joinCode: string, userId: string): Promise<Business | null> {
  if (!isValidJoinCode(joinCode)) {
    return null;
  }

  const attempts = pruneAttempts(userId);
  if (attempts.length >= RATE_LIMIT_MAX) {
    throw new Error('Join code attempts are temporarily rate-limited.');
  }

  recordAttempt(userId);
  return (await powersync.getOptional<Business>('SELECT * FROM businesses WHERE join_code = ?', [joinCode])) ?? null;
}

export async function loadBusinessSummariesForUser(userId: string): Promise<BusinessSummary[]> {
  const memberships = await powersync.getAll<{
    business_id: string;
    role: UserRole;
    branch_id: string | null;
  }>('SELECT business_id, role, branch_id FROM business_members WHERE user_id = ? AND is_active = 1', [userId]);

  const summaries: BusinessSummary[] = [];
  for (const membership of memberships) {
    const business = await powersync.getOptional<Business>('SELECT * FROM businesses WHERE id = ?', [membership.business_id]);
    if (!business) {
      continue;
    }

    let branchName: string | null = null;
    let branchId: string | null = membership.branch_id;
    if (branchId) {
      const branch = await powersync.getOptional<{ id: string; name: string }>('SELECT id, name FROM branches WHERE id = ?', [
        branchId,
      ]);
      branchName = branch?.name ?? null;
    }

    summaries.push({
      businessId: business.id,
      businessName: business.name,
      role: membership.role,
      branchId,
      branchName,
    });
  }

  return summaries;
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
  const business = await validateJoinCode(input.joinCode, input.userId);
  if (!business) {
    throw new Error('Invalid join code.');
  }

  await db.writeTransaction(async (tx) => {
    await tx.addBusinessMember({
      businessId: business.id,
      userId: input.userId,
      role: input.role ?? 'employee',
      branchId: null,
    });
  });

  const summary = (await loadBusinessSummariesForUser(input.userId)).find(
    (entry) => entry.businessId === business.id,
  );
  if (!summary) {
    throw new Error('Unable to resolve joined business.');
  }

  useBusinessStore.getState().setAvailableBusinesses(await loadBusinessSummariesForUser(input.userId));
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
