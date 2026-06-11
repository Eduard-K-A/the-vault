import type { SyncSessionSnapshot } from '@/types/sync';

interface EnterSelectedBusinessDependencies {
  setSyncSession: (session: SyncSessionSnapshot) => void;
  syncNow: () => Promise<void>;
  hydrateBusinessData?: (businessId: string) => Promise<void>;
  setLastError?: (message: string) => void;
}

export async function enterSelectedBusiness(
  session: SyncSessionSnapshot,
  dependencies: EnterSelectedBusinessDependencies,
): Promise<void> {
  dependencies.setSyncSession(session);

  try {
    await dependencies.syncNow();
  } catch (error) {
    dependencies.setLastError?.(error instanceof Error ? error.message : 'Business sync failed');
  }

  if (session.businessId) {
    await dependencies.hydrateBusinessData?.(session.businessId);
  }
}
