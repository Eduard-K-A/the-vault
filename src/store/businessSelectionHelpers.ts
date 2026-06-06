import type { Branch, Business, BusinessSummary } from '@/types/models';

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
