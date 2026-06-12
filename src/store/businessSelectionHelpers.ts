import type { Branch, Business, BusinessSummary } from '@/types/models';

type BranchLookup = (sql: string, params: unknown[]) => Promise<Branch | null>;

const FIRST_ACTIVE_BRANCH_SQL =
  'SELECT * FROM branches WHERE business_id = ? AND is_active = 1 UNION ALL SELECT fallback_branches.* FROM fallback_branches WHERE business_id = ? AND is_active = 1 AND NOT EXISTS (SELECT 1 FROM branches WHERE branches.id = fallback_branches.id) ORDER BY created_at ASC LIMIT 1';
const BRANCH_BY_ID_SQL =
  'SELECT * FROM branches WHERE id = ? UNION ALL SELECT fallback_branches.* FROM fallback_branches WHERE id = ? AND NOT EXISTS (SELECT 1 FROM branches WHERE branches.id = fallback_branches.id) LIMIT 1';

export function buildFallbackBusinessFromSummary(
  summary: BusinessSummary,
  createdAt = new Date().toISOString(),
): Business {
  return {
    id: summary.businessId,
    name: summary.businessName,
    owner_id: '',
    join_code: '',
    logo_url: null,
    address: null,
    is_active: true,
    created_at: createdAt,
  };
}

export function buildFallbackBranchFromSummary(summary: BusinessSummary): Branch | null {
  if (!summary.branchId) {
    return null;
  }

  return {
    id: summary.branchId,
    business_id: summary.businessId,
    name: summary.branchName ?? 'Main Branch',
    is_active: true,
  };
}

export async function resolveSelectableBranch(
  summary: BusinessSummary,
  lookupBranch: BranchLookup,
  onMissingBranch?: () => Promise<void>,
): Promise<Branch | null> {
  const branch =
    (summary.branchId
      ? await lookupBranch(BRANCH_BY_ID_SQL, [summary.branchId, summary.branchId])
      : await lookupBranch(FIRST_ACTIVE_BRANCH_SQL, [summary.businessId, summary.businessId])) ??
    buildFallbackBranchFromSummary(summary);

  if (branch || !onMissingBranch) {
    return branch;
  }

  await onMissingBranch();

  return lookupBranch(FIRST_ACTIVE_BRANCH_SQL, [summary.businessId, summary.businessId]);
}
