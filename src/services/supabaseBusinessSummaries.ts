import type { BusinessSummary, UserRole } from '@/types/models';

interface SupabaseQuery<T> extends PromiseLike<{ data: T[] | null; error: { message?: string } | null }> {
  eq(column: string, value: unknown): SupabaseQuery<T>;
  in(column: string, values: unknown[]): SupabaseQuery<T>;
}

interface SupabaseBusinessSummaryClient {
  functions?: {
    invoke(
      name: string,
      options?: { body?: Record<string, unknown> },
    ): Promise<{ data: unknown; error: { message?: string } | null }>;
  };
  from(table: string): {
    select(columns?: string): unknown;
  };
}

interface OwnedBusinessRow {
  id: string;
  name: string;
}

interface MembershipRow {
  business_id: string;
  role: UserRole;
  branch_id: string | null;
}

interface BranchRow {
  id: string;
  business_id: string;
  name: string;
}

const ROLE_PRIORITY: Record<UserRole, number> = {
  employee: 0,
  owner: 1,
};

function mergeSummary(existing: BusinessSummary | undefined, next: BusinessSummary): BusinessSummary {
  if (!existing) {
    return next;
  }

  const existingPriority = ROLE_PRIORITY[existing.role] ?? 0;
  const nextPriority = ROLE_PRIORITY[next.role] ?? 0;

  return {
    businessId: existing.businessId,
    businessName: existing.businessName || next.businessName,
    role: nextPriority > existingPriority ? next.role : existing.role,
    branchId: existing.branchId ?? next.branchId,
    branchName: existing.branchName ?? next.branchName,
  };
}

async function resolveRows<T>(query: SupabaseQuery<T>): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message ?? 'Unable to load remote business summaries.');
  }

  return data ?? [];
}

function selectRows<T>(client: SupabaseBusinessSummaryClient, table: string, columns: string): SupabaseQuery<T> {
  return client.from(table).select(columns) as SupabaseQuery<T>;
}

function isBusinessSummary(value: unknown): value is BusinessSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Record<string, unknown>;
  const role = row.role;
  return (
    typeof row.businessId === 'string' &&
    typeof row.businessName === 'string' &&
    (role === 'owner' || role === 'employee') &&
    (typeof row.branchId === 'string' || row.branchId === null) &&
    (typeof row.branchName === 'string' || row.branchName === null)
  );
}

function parseFunctionSummaries(data: unknown): BusinessSummary[] | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const summaries = (data as { summaries?: unknown }).summaries;
  if (!Array.isArray(summaries)) {
    return null;
  }

  return summaries.every(isBusinessSummary) ? summaries : null;
}

async function loadFunctionBusinessSummaries(
  client: SupabaseBusinessSummaryClient,
  userId: string,
): Promise<BusinessSummary[] | null> {
  if (!client.functions) {
    return null;
  }

  const { data, error } = await client.functions.invoke('business-summaries', {
    body: { user_id: userId },
  });
  if (error) {
    return null;
  }

  return parseFunctionSummaries(data);
}

export async function loadSupabaseBusinessSummariesForUser(
  client: SupabaseBusinessSummaryClient,
  userId: string,
): Promise<BusinessSummary[]> {
  const functionSummaries = await loadFunctionBusinessSummaries(client, userId);
  if (functionSummaries) {
    return functionSummaries;
  }

  const ownedBusinesses = await resolveRows(
    selectRows<OwnedBusinessRow>(client, 'businesses', 'id, name').eq('owner_id', userId).eq('is_active', true),
  );
  const memberships = await resolveRows(
    selectRows<MembershipRow>(client, 'business_members', 'business_id, role, branch_id')
      .eq('user_id', userId)
      .eq('is_active', true),
  );

  const membershipBusinessIds = [...new Set(memberships.map((membership) => membership.business_id))];
  const ownedBusinessIds = ownedBusinesses.map((business) => business.id);
  const businessIds = [...new Set([...ownedBusinessIds, ...membershipBusinessIds])];
  const membershipBusinesses =
    membershipBusinessIds.length > 0
      ? await resolveRows(
          selectRows<OwnedBusinessRow>(client, 'businesses', 'id, name')
            .in('id', membershipBusinessIds)
            .eq('is_active', true),
        )
      : [];
  const membershipBranches = memberships.map((membership) => membership.branch_id).filter((id): id is string => Boolean(id));
  const branchIds = [...new Set(membershipBranches)];
  const branches =
    businessIds.length > 0
      ? await resolveRows(
          selectRows<BranchRow>(client, 'branches', 'id, business_id, name')
            .in('business_id', businessIds)
            .eq('is_active', true),
        )
      : [];
  const businessesById = new Map([...ownedBusinesses, ...membershipBusinesses].map((business) => [business.id, business]));
  const branchesById = new Map(branches.map((branch) => [branch.id, branch]));
  const firstBranchByBusinessId = new Map<string, BranchRow>();
  for (const branch of branches) {
    if (!firstBranchByBusinessId.has(branch.business_id)) {
      firstBranchByBusinessId.set(branch.business_id, branch);
    }
  }
  const summaries = new Map<string, BusinessSummary>();

  for (const business of ownedBusinesses) {
    const branch = firstBranchByBusinessId.get(business.id) ?? null;
    const next = {
      businessId: business.id,
      businessName: business.name,
      role: 'owner' as const,
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? null,
    };
    summaries.set(next.businessId, mergeSummary(summaries.get(next.businessId), next));
  }

  for (const membership of memberships) {
    const business = businessesById.get(membership.business_id);
    if (!business) {
      continue;
    }

    const branch = membership.branch_id ? branchesById.get(membership.branch_id) : null;
    const next = {
      businessId: business.id,
      businessName: business.name,
      role: membership.role,
      branchId: membership.branch_id,
      branchName: branch?.name ?? null,
    };
    summaries.set(next.businessId, mergeSummary(summaries.get(next.businessId), next));
  }

  return [...summaries.values()];
}
