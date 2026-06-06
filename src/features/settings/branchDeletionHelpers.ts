import type { Branch } from '@/types/models';

export function canConfirmBranchDeletion(branch: Branch | null, confirmation: string): boolean {
  return Boolean(branch && confirmation === branch.name);
}
