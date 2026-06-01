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
  const id = typeof body.id === 'string' ? body.id : null;
  const fullname = typeof body.fullname === 'string' ? body.fullname : null;
  const email = typeof body.email === 'string' ? body.email : null;
  const createdAt = typeof body.created_at === 'string' ? body.created_at : new Date().toISOString();
  const phoneNumber = typeof body.phone_number === 'string' || body.phone_number === null ? body.phone_number : null;
  const avatarUrl = typeof body.avatar_url === 'string' || body.avatar_url === null ? body.avatar_url : null;

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
