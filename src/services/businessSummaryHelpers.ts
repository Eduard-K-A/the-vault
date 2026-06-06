import type { BusinessSummary, UserRole } from '@/types/models';

export interface OwnedBusinessSummaryRow {
  business_id: string;
  business_name: string;
}

export interface MembershipBusinessSummaryRow {
  business_id: string;
  business_name: string;
  role: UserRole;
  branch_id: string | null;
  branch_name: string | null;
}

const ROLE_PRIORITY: Record<UserRole, number> = {
  employee: 0,
  owner: 1,
};

function buildSummaryFromRow(
  row: OwnedBusinessSummaryRow | MembershipBusinessSummaryRow,
  role: UserRole,
): BusinessSummary {
  return {
    businessId: row.business_id,
    businessName: row.business_name,
    role,
    branchId: 'branch_id' in row ? row.branch_id : null,
    branchName: 'branch_name' in row ? row.branch_name : null,
  };
}

export function mergeBusinessSummaryRecord(
  existing: BusinessSummary | undefined,
  next: BusinessSummary,
): BusinessSummary {
  if (!existing) {
    return next;
  }

  const existingPriority = ROLE_PRIORITY[existing.role] ?? 0;
  const nextPriority = ROLE_PRIORITY[next.role] ?? 0;

  return {
    businessId: existing.businessId,
    businessName: existing.businessName || next.businessName,
    role: nextPriority > existingPriority ? next.role : existing.role,
    branchId: existing.branchId ?? next.branchId,
    branchName: existing.branchName ?? next.branchName,
  };
}

export function composeBusinessSummaries(input: {
  ownedBusinesses: OwnedBusinessSummaryRow[];
  memberships: MembershipBusinessSummaryRow[];
}): BusinessSummary[] {
  const summaries = new Map<string, BusinessSummary>();

  for (const business of input.ownedBusinesses) {
    const next = buildSummaryFromRow(business, 'owner');
    summaries.set(next.businessId, mergeBusinessSummaryRecord(summaries.get(next.businessId), next));
  }

  for (const membership of input.memberships) {
    const next = buildSummaryFromRow(membership, membership.role);
    summaries.set(next.businessId, mergeBusinessSummaryRecord(summaries.get(next.businessId), next));
  }

  return [...summaries.values()];
}
