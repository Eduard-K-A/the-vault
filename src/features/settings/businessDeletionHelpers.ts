import type { Business } from '@/types/models';

export function canConfirmBusinessDeletion(business: Business | null, confirmation: string): boolean {
  return Boolean(business && confirmation === business.name);
}
