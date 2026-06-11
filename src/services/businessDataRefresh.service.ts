import { applyBusinessFallbackCache } from '@/db/businessFallbackCache';
import { refreshBusinessDataWithDependencies } from '@/services/businessDataRefreshHelpers';
import { fetchBusinessBootstrapSnapshot } from '@/services/remoteApi';
import { logBusinessRefreshDebug } from '@/utils/syncDebug';

type BusinessSnapshot = NonNullable<Awaited<ReturnType<typeof fetchBusinessBootstrapSnapshot>>>;

interface RefreshBusinessDataDependencies {
  fetchSnapshot?: (businessId: string, traceId?: string) => Promise<BusinessSnapshot | null>;
  applySnapshot?: (snapshot: BusinessSnapshot, traceId?: string) => Promise<void>;
}

export interface BusinessDataRefreshResult {
  applied: boolean;
  productCount: number;
}

export async function refreshBusinessDataFromDatabase(
  businessId: string,
  dependencies: RefreshBusinessDataDependencies = {},
  traceId?: string,
): Promise<BusinessDataRefreshResult> {
  logBusinessRefreshDebug(traceId, 'started', { businessId });
  const result = await refreshBusinessDataWithDependencies(businessId, {
    fetchSnapshot: dependencies.fetchSnapshot ?? fetchBusinessBootstrapSnapshot,
    applySnapshot: async (snapshot) => {
      logBusinessRefreshDebug(traceId, 'apply started', {
        businessId,
        products: snapshot.products?.length ?? 0,
        inventory: snapshot.inventory?.length ?? 0,
        branches: snapshot.branches?.length ?? 0,
      });
      await (dependencies.applySnapshot ?? applyBusinessFallbackCache)(snapshot, traceId);
      logBusinessRefreshDebug(traceId, 'apply completed', { businessId });
    },
  }, traceId);
  logBusinessRefreshDebug(traceId, 'completed', { ...result });
  return result;
}
