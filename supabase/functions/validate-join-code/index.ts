import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const attempts = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function pruneAttempts(userId: string): number[] {
  const now = Date.now();
  const current = attempts.get(userId) ?? [];
  const pruned = current.filter((timestamp) => now - timestamp <= WINDOW_MS);
  attempts.set(userId, pruned);
  return pruned;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const { join_code: joinCode, user_id: userId } = await request.json().catch(() => ({}));
  if (typeof joinCode !== 'string' || typeof userId !== 'string') {
    return json({ error: 'join_code and user_id are required' }, 400);
  }

  const pruned = pruneAttempts(userId);
  if (pruned.length >= MAX_ATTEMPTS) {
    return json({ error: 'rate_limited' }, 429);
  }
  pruned.push(Date.now());
  attempts.set(userId, pruned);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, join_code, is_active')
    .eq('join_code', joinCode.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }

  if (!data) {
    return json({ error: 'invalid_join_code' }, 404);
  }

  return json({
    business_id: data.id,
    business_name: data.name,
  });
});

