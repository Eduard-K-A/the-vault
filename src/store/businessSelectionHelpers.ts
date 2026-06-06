import type { Business, BusinessSummary } from '@/types/models';

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
