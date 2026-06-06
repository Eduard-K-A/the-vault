import { buildFunctionInvokeOptions, getFunctionAccessToken } from '@/powersync/uploadHelpers';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { buildDeleteBusinessEnvelope } from '@/services/deleteBusinessHelpers';

export async function deleteBusinessRemotely(businessId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const accessToken = await getFunctionAccessToken(client, useAuthStore.getState().accessToken);
  if (!accessToken) {
    throw new Error('No active Supabase session.');
  }

  const { error } = await client.functions.invoke(
    'delete-business',
    buildFunctionInvokeOptions(buildDeleteBusinessEnvelope(businessId), accessToken),
  );
  if (error) {
    throw error;
  }
}
