import { applyBusinessBootstrapSnapshot } from '@/db/powersync';
import { refreshBusinessDataWithDependencies } from '@/services/businessDataRefreshHelpers';
import { fetchBusinessBootstrapSnapshot } from '@/services/remoteApi';

type BusinessSnapshot = NonNullable<Awaited<ReturnType<typeof fetchBusinessBootstrapSnapshot>>>;

interface RefreshBusinessDataDependencies {
  fetchSnapshot?: (businessId: string) => Promise<BusinessSnapshot | null>;
  applySnapshot?: (snapshot: BusinessSnapshot) => Promise<void>;
}

export interface BusinessDataRefreshResult {
  applied: boolean;
  productCount: number;
}

export async function refreshBusinessDataFromDatabase(
  businessId: string,
  dependencies: RefreshBusinessDataDependencies = {},
): Promise<BusinessDataRefreshResult> {
  return refreshBusinessDataWithDependencies(businessId, {
    fetchSnapshot: dependencies.fetchSnapshot ?? fetchBusinessBootstrapSnapshot,
    applySnapshot: dependencies.applySnapshot ?? applyBusinessBootstrapSnapshot,
  });
}
