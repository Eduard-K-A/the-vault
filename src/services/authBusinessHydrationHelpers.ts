import type { BusinessSummary } from '@/types/models';

interface HydrateAvailableBusinessesFromSourcesInput {
  userId: string;
  loadRemoteBusinessSummaries: (userId: string) => Promise<BusinessSummary[]>;
  loadLocalBusinessSummaries: (userId: string) => Promise<BusinessSummary[]>;
  setAvailableBusinesses: (businesses: BusinessSummary[]) => void;
}

export async function hydrateAvailableBusinessesFromSources(
  input: HydrateAvailableBusinessesFromSourcesInput,
): Promise<BusinessSummary[]> {
  let summaries: BusinessSummary[] = [];
  try {
    summaries = await input.loadRemoteBusinessSummaries(input.userId);
  } catch {
    summaries = [];
  }

  if (summaries.length === 0) {
    summaries = await input.loadLocalBusinessSummaries(input.userId);
  }

  input.setAvailableBusinesses(summaries);
  return summaries;
}
