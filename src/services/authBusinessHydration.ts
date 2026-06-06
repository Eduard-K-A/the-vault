import { loadBusinessSummariesForUser } from '@/services/business.service';
import { hydrateAvailableBusinessesFromSources } from '@/services/authBusinessHydrationHelpers';
import { getSupabaseClient } from '@/services/supabaseClient';
import { loadSupabaseBusinessSummariesForUser } from '@/services/supabaseBusinessSummaries';
import { useBusinessStore } from '@/store/businessStore';
import type { BusinessSummary } from '@/types/models';

interface HydrateAvailableBusinessesInput {
  userId: string;
  loadRemoteBusinessSummaries?: (userId: string) => Promise<BusinessSummary[]>;
  loadLocalBusinessSummaries?: (userId: string) => Promise<BusinessSummary[]>;
  setAvailableBusinesses?: (businesses: BusinessSummary[]) => void;
}

async function loadRemoteBusinessSummaries(userId: string): Promise<BusinessSummary[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  return loadSupabaseBusinessSummariesForUser(client, userId);
}

export async function hydrateAvailableBusinessesForUser(input: HydrateAvailableBusinessesInput): Promise<BusinessSummary[]> {
  return hydrateAvailableBusinessesFromSources({
    userId: input.userId,
    loadRemoteBusinessSummaries: input.loadRemoteBusinessSummaries ?? loadRemoteBusinessSummaries,
    loadLocalBusinessSummaries: input.loadLocalBusinessSummaries ?? loadBusinessSummariesForUser,
    setAvailableBusinesses: input.setAvailableBusinesses ?? useBusinessStore.getState().setAvailableBusinesses,
  });
}
