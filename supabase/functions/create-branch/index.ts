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
  const name = typeof raw.name === 'string' ? raw.name : null;
  const createdAt = typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString();
  const updatedAt = typeof raw.updated_at === 'string' ? raw.updated_at : createdAt;
  const isActive = raw.is_active === false ? false : true;

  if (!id || !businessId || !name) {
    return json({ error: 'id, business_id, and name are required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('branches').upsert(
    {
      id,
      business_id: businessId,
      name,
      is_active: isActive,
      created_at: createdAt,
      updated_at: updatedAt,
    },
    { onConflict: 'id' },
  );

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
