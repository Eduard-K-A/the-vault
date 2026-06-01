export type SyncPhase =
  | 'booting'
  | 'unauthenticated'
  | 'syncing'
  | 'ready'
  | 'offline'
  | 'degraded'
  | 'failed';

export interface SyncSessionSnapshot {
  userId: string | null;
  businessId: string | null;
  branchId: string | null;
}
