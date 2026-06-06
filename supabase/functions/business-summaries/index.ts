import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type UserRole = 'employee' | 'owner';

interface BusinessSummary {
  businessId: string;
  businessName: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
}

const ROLE_PRIORITY: Record<UserRole, number> = {
  employee: 0,
  owner: 1,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

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

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500);
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: 'unauthorized' }, 401);
  }

  const userId = userData.user.id;
  const [ownedResult, membershipResult] = await Promise.all([
    supabase.from('businesses').select('id, name').eq('owner_id', userId).eq('is_active', true),
    supabase
      .from('business_members')
      .select('business_id, role, branch_id')
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  if (ownedResult.error) {
    return json({ error: ownedResult.error.message }, 500);
  }

  if (membershipResult.error) {
    return json({ error: membershipResult.error.message }, 500);
  }

  const ownedBusinesses = ownedResult.data ?? [];
  const memberships = membershipResult.data ?? [];
  const membershipBusinessIds = [...new Set(memberships.map((membership) => membership.business_id))];
  const ownedBusinessIds = ownedBusinesses.map((business) => business.id);
  const businessIds = [...new Set([...ownedBusinessIds, ...membershipBusinessIds])];

  const [membershipBusinessesResult, branchesResult] = await Promise.all([
    membershipBusinessIds.length > 0
      ? supabase.from('businesses').select('id, name').in('id', membershipBusinessIds).eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
    businessIds.length > 0
      ? supabase.from('branches').select('id, business_id, name').in('business_id', businessIds).eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (membershipBusinessesResult.error) {
    return json({ error: membershipBusinessesResult.error.message }, 500);
  }

  if (branchesResult.error) {
    return json({ error: branchesResult.error.message }, 500);
  }

  const businessesById = new Map(
    [...ownedBusinesses, ...(membershipBusinessesResult.data ?? [])].map((business) => [business.id, business]),
  );
  const branchesById = new Map((branchesResult.data ?? []).map((branch) => [branch.id, branch]));
  const firstBranchByBusinessId = new Map<string, { id: string; business_id: string; name: string }>();
  for (const branch of branchesResult.data ?? []) {
    if (!firstBranchByBusinessId.has(branch.business_id)) {
      firstBranchByBusinessId.set(branch.business_id, branch);
    }
  }
  const summaries = new Map<string, BusinessSummary>();

  for (const business of ownedBusinesses) {
    const branch = firstBranchByBusinessId.get(business.id) ?? null;
    const next: BusinessSummary = {
      businessId: business.id,
      businessName: business.name,
      role: 'owner',
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
    const next: BusinessSummary = {
      businessId: business.id,
      businessName: business.name,
      role: membership.role,
      branchId: membership.branch_id,
      branchName: branch?.name ?? null,
    };
    summaries.set(next.businessId, mergeSummary(summaries.get(next.businessId), next));
  }

  return json({ summaries: [...summaries.values()] });
});
