function readEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const offlineConfig = {
  appEnv: readEnv('EXPO_PUBLIC_APP_ENV') ?? 'development',
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  powerSyncUrl: readEnv('EXPO_PUBLIC_POWERSYNC_URL'),
  powerSyncSchema: readEnv('EXPO_PUBLIC_POWERSYNC_SCHEMA') ?? 'public',
} as const;

export function hasRemoteSyncConfig(): boolean {
  return Boolean(offlineConfig.supabaseUrl && offlineConfig.supabaseAnonKey && offlineConfig.powerSyncUrl);
}

