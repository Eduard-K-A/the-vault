export interface BusinessDataSnapshot {
  products?: unknown[];
}

export interface BusinessDataRefreshResult {
  applied: boolean;
  productCount: number;
}

export interface RefreshBusinessDataDependencies<TSnapshot extends BusinessDataSnapshot> {
  fetchSnapshot: (businessId: string, traceId?: string) => Promise<TSnapshot | null>;
  applySnapshot: (snapshot: TSnapshot, traceId?: string) => Promise<void>;
}

export async function refreshBusinessDataWithDependencies<TSnapshot extends BusinessDataSnapshot>(
  businessId: string,
  dependencies: RefreshBusinessDataDependencies<TSnapshot>,
  traceId?: string,
): Promise<BusinessDataRefreshResult> {
  const snapshot = await dependencies.fetchSnapshot(businessId, traceId);

  if (!snapshot) {
    return {
      applied: false,
      productCount: 0,
    };
  }

  await dependencies.applySnapshot(snapshot, traceId);
  return {
    applied: true,
    productCount: snapshot.products?.length ?? 0,
  };
}
