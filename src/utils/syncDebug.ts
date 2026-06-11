export type SyncDebugDetails = Record<string, unknown>;

export function createSyncTraceId(label: string): string {
  return `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildSyncDebugPrefix(traceId: string): string {
  return `[sync-now:${traceId}]`;
}

export function logSyncDebug(traceId: string, message: string, details?: SyncDebugDetails): void {
  const prefix = buildSyncDebugPrefix(traceId);
  if (details) {
    console.debug(`${prefix} ${message}`, details);
    return;
  }

  console.debug(`${prefix} ${message}`);
}

export function logBusinessRefreshDebug(
  traceId: string | null | undefined,
  message: string,
  details?: SyncDebugDetails,
): void {
  if (traceId) {
    logSyncDebug(traceId, `business refresh: ${message}`, details);
    return;
  }

  if (details) {
    console.debug(`[business-refresh] ${message}`, details);
    return;
  }

  console.debug(`[business-refresh] ${message}`);
}

export function logPowerSyncBackground(message: string, details?: SyncDebugDetails): void {
  if (details) {
    console.debug(`[powersync-bg] ${message}`, details);
    return;
  }

  console.debug(`[powersync-bg] ${message}`);
}
