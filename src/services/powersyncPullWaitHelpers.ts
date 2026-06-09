export interface ManualPullStatus {
  connected?: boolean | null;
  connecting?: boolean | null;
  hasSynced?: boolean | null;
  lastSyncedAt?: Date | string | null;
  dataFlowStatus?: {
    downloading?: boolean;
    downloadError?: Error | { message?: string } | string | null;
  };
}

export interface ManualPullConfirmationOptions {
  getStatus: () => ManualPullStatus | null | undefined;
  waitForFirstSync: () => Promise<void>;
  waitForDownloadIdle?: () => Promise<void>;
  debug?: (message: 'active-download' | 'existing-snapshot' | 'first-sync') => void;
}

export function hasCompletedSync(status: ManualPullStatus | null | undefined): boolean {
  return status?.hasSynced === true || status?.lastSyncedAt != null;
}

export function isDownloading(status: ManualPullStatus | null | undefined): boolean {
  return status?.dataFlowStatus?.downloading === true;
}

function getDownloadErrorMessage(status: ManualPullStatus | null | undefined): string | null {
  const error = status?.dataFlowStatus?.downloadError;
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  return error.message ?? null;
}

export async function waitForManualPullConfirmation(options: ManualPullConfirmationOptions): Promise<void> {
  const status = options.getStatus();
  if (hasCompletedSync(status)) {
    if (isDownloading(status)) {
      options.debug?.('active-download');
      await options.waitForDownloadIdle?.();
    } else {
      options.debug?.('existing-snapshot');
    }
    return;
  }

  const downloadError = getDownloadErrorMessage(status);
  if (downloadError) {
    throw new Error(`PowerSync connection failed. Latest download error: ${downloadError}`);
  }

  if (status?.connected !== true && status?.connecting !== true) {
    throw new Error('PowerSync is not connected. Check EXPO_PUBLIC_POWERSYNC_URL and network connectivity.');
  }

  options.debug?.('first-sync');
  await options.waitForFirstSync();
}
