import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { offlineConfig } from '@/config/offline';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }

  if (!offlineConfig.supabaseUrl || !offlineConfig.supabaseAnonKey) {
    return null;
  }

  client = createClient(offlineConfig.supabaseUrl, offlineConfig.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}

