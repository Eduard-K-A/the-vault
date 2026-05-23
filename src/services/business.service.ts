import { db } from '@/db/powersync';
import {
  createBusiness as createBusinessRecord,
  findBusinessByJoinCode,
  getBusinessSummariesForUser,
  getLocalDbState,
} from '@/db/localDb';
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
  return findBusinessByJoinCode(joinCode);
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

  const business = createBusinessRecord({
    name: input.name.trim(),
    ownerId: auth.userId,
    address: input.address ?? null,
    branchName: input.branchName?.trim() || 'Main Branch',
  });

  const summary: BusinessSummary = {
    businessId: business.id,
    businessName: business.name,
    role: 'owner',
    branchId: getLocalDbState().branches.find((branch) => branch.business_id === business.id)?.id ?? null,
    branchName: getLocalDbState().branches.find((branch) => branch.business_id === business.id)?.name ?? null,
  };

  useBusinessStore.getState().setAvailableBusinesses(getBusinessSummariesForUser(auth.userId));

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
    tx.addBusinessMember({
      businessId: business.id,
      userId: input.userId,
      role: input.role ?? 'employee',
      branchId: getLocalDbState().branches.find((branch) => branch.business_id === business.id)?.id ?? null,
    });
  });

  const summary = getBusinessSummariesForUser(input.userId).find(
    (entry) => entry.businessId === business.id,
  );
  if (!summary) {
    throw new Error('Unable to resolve joined business.');
  }

  useBusinessStore.getState().setAvailableBusinesses(getBusinessSummariesForUser(input.userId));
  return summary;
}

export function getSelectedBusinessSummary(): BusinessSummary | null {
  const businessId = useBusinessStore.getState().activeBusiness?.id ?? null;
  const userId = useAuthStore.getState().userId ?? null;
  if (!businessId || !userId) {
    return null;
  }

  return getBusinessSummariesForUser(userId).find((entry) => entry.businessId === businessId) ?? null;
}
