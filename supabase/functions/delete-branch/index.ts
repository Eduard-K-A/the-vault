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
  const raw = body.payload && typeof body.payload === 'object' ? (body.payload as Record<string, unknown>) : body;
  const id = typeof raw.id === 'string' ? raw.id : null;
  if (!id) {
    return json({ error: 'id is required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorization = request.headers.get('authorization') ?? '';
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500);
  }
  if (!authorization) {
    return json({ error: 'unauthorized' }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user) {
    return json({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: branch, error: branchError } = await admin
    .from('branches')
    .select('id, business_id')
    .eq('id', id)
    .maybeSingle();
  if (branchError) {
    return json({ error: branchError.message }, 500);
  }
  if (!branch) {
    return json({ ok: true });
  }

  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('owner_id')
    .eq('id', branch.business_id)
    .maybeSingle();
  if (businessError) {
    return json({ error: businessError.message }, 500);
  }
  if (business?.owner_id === user.id) {
    const { error } = await admin.from('branches').delete().eq('id', id);
    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ ok: true });
  }

  const { data: membership, error: membershipError } = await admin
    .from('business_members')
    .select('id')
    .eq('business_id', branch.business_id)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  if (membershipError) {
    return json({ error: membershipError.message }, 500);
  }
  if (!membership) {
    return json({ error: 'forbidden' }, 403);
  }

  const { error } = await admin.from('branches').delete().eq('id', id);
  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
