import type { SyncSessionSnapshot } from '@/types/sync';

interface EnterSelectedBusinessDependencies {
  setSyncSession: (session: SyncSessionSnapshot) => void;
  hydrateBusinessData?: (businessId: string) => Promise<void>;
  syncNow: () => Promise<void>;
  setLastError?: (message: string) => void;
}

export async function enterSelectedBusiness(
  session: SyncSessionSnapshot,
  dependencies: EnterSelectedBusinessDependencies,
): Promise<void> {
  dependencies.setSyncSession(session);

  if (session.businessId) {
    try {
      await dependencies.hydrateBusinessData?.(session.businessId);
    } catch (error) {
      dependencies.setLastError?.(error instanceof Error ? error.message : 'Business data hydration failed');
    }
  }

  try {
    await dependencies.syncNow();
  } catch (error) {
    dependencies.setLastError?.(error instanceof Error ? error.message : 'Business sync failed');
  }
}
