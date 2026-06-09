export interface BusinessDataSnapshot {
  products?: unknown[];
}

export interface BusinessDataRefreshResult {
  applied: boolean;
  productCount: number;
}

export interface RefreshBusinessDataDependencies<TSnapshot extends BusinessDataSnapshot> {
  fetchSnapshot: (businessId: string) => Promise<TSnapshot | null>;
  applySnapshot: (snapshot: TSnapshot) => Promise<void>;
}

export async function refreshBusinessDataWithDependencies<TSnapshot extends BusinessDataSnapshot>(
  businessId: string,
  dependencies: RefreshBusinessDataDependencies<TSnapshot>,
): Promise<BusinessDataRefreshResult> {
  const snapshot = await dependencies.fetchSnapshot(businessId);

  if (!snapshot) {
    return {
      applied: false,
      productCount: 0,
    };
  }

  await dependencies.applySnapshot(snapshot);
  return {
    applied: true,
    productCount: snapshot.products?.length ?? 0,
  };
}
