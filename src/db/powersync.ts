import { useSyncExternalStore } from 'react';

import type { LocalDbState } from '@/db/localDb';
import {
  addAuditLog,
  addBusinessMember,
  archiveProduct,
  createBusiness,
  createSale,
  getLocalDbState,
  getVersion,
  markSaleSynced,
  restockInventory,
  subscribe,
  upsertProduct,
} from '@/db/localDb';

export type QuerySelector<T> = (state: LocalDbState) => T;

export interface PowerSyncQueryOptions<T> {
  selector: QuerySelector<T>;
}

export interface LocalTransaction {
  addAuditLog: typeof addAuditLog;
  addBusinessMember: typeof addBusinessMember;
  archiveProduct: typeof archiveProduct;
  createBusiness: typeof createBusiness;
  createSale: typeof createSale;
  markSaleSynced: typeof markSaleSynced;
  restockInventory: typeof restockInventory;
  upsertProduct: typeof upsertProduct;
}

const transaction: LocalTransaction = {
  addAuditLog,
  addBusinessMember,
  archiveProduct,
  createBusiness,
  createSale,
  markSaleSynced,
  restockInventory,
  upsertProduct,
};

export function usePowerSyncQuery<T>(
  _query: string,
  _params: readonly unknown[] = [],
  options: PowerSyncQueryOptions<T>,
): { data: T } {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const data = options.selector(getLocalDbState());
  return { data };
}

export const db = {
  async writeTransaction<T>(operation: (tx: LocalTransaction) => Promise<T> | T): Promise<T> {
    return operation(transaction);
  },
};

