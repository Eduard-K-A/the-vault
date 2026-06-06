import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return json({ error: 'invalid_payload' }, 400);
  }

  const body = payload as Record<string, unknown>;
  const raw = (body.payload && typeof body.payload === 'object' ? (body.payload as Record<string, unknown>) : body);

  const id = typeof raw.id === 'string' ? raw.id : null;
  const businessId = typeof raw.business_id === 'string' ? raw.business_id : null;
  const userId = typeof raw.user_id === 'string' ? raw.user_id : null;
  const role = raw.role === 'owner' || raw.role === 'employee' || raw.role === 'manager' ? raw.role : null;
  const branchId = typeof raw.branch_id === 'string' ? raw.branch_id : null;
  const joinedAt = typeof raw.joined_at === 'string' ? raw.joined_at : new Date().toISOString();
  const isActive = raw.is_active === false ? false : true;

  if (!id || !businessId || !userId || !role) {
    return json({ error: 'id, business_id, user_id, and role are required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('business_members').upsert(
    {
      id,
      business_id: businessId,
      user_id: userId,
      role,
      branch_id: branchId,
      is_active: isActive,
      joined_at: joinedAt,
    },
    { onConflict: 'id' },
  );

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
