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
  const fullname = typeof raw.fullname === 'string' ? raw.fullname : null;
  const email = typeof raw.email === 'string' ? raw.email : null;
  const role = raw.role === 'owner' || raw.role === 'employee' ? raw.role : 'employee';
  const createdAt = typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString();
  const phoneNumber = typeof raw.phone_number === 'string' || raw.phone_number === null ? raw.phone_number : null;
  const avatarUrl = typeof raw.avatar_url === 'string' || raw.avatar_url === null ? raw.avatar_url : null;

  if (!id || !fullname || !email) {
    return json({ error: 'id, fullname, and email are required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from('profiles').upsert(
    {
      id,
      fullname,
      email,
      role,
      phone_number: phoneNumber,
      avatar_url: avatarUrl,
      created_at: createdAt,
    },
    { onConflict: 'id' },
  );

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
