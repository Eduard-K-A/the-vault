import type { AuthSession } from '@/types/models';

export function shouldLoadBootstrapSnapshot(session: AuthSession | null): boolean {
  return false;
}
