import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' || value === null ? value : null;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0) {
    return false;
  }
  return fallback;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'invalid_payload' }, 400);
  }

  const envelope = body as Record<string, unknown>;
  const raw =
    envelope.payload && typeof envelope.payload === 'object'
      ? (envelope.payload as Record<string, unknown>)
      : envelope;

  const id = typeof raw.id === 'string' ? raw.id : null;
  const businessId = typeof raw.business_id === 'string' ? raw.business_id : null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const sellingPrice = typeof raw.selling_price === 'number' ? raw.selling_price : Number(raw.selling_price);
  const costPrice = typeof raw.cost_price === 'number' ? raw.cost_price : Number(raw.cost_price);

  if (!id || !businessId || !name || !Number.isFinite(sellingPrice) || !Number.isFinite(costPrice)) {
    return json({ error: 'id, business_id, name, selling_price, and cost_price are required' }, 400);
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
  const { data: membership, error: membershipError } = await admin
    .from('business_members')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('role', ['owner', 'manager'])
    .maybeSingle();

  if (membershipError) {
    return json({ error: membershipError.message }, 500);
  }
  if (!membership) {
    return json({ error: 'forbidden' }, 403);
  }

  const createdAt = typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString();
  const updatedAt = typeof raw.updated_at === 'string' ? raw.updated_at : new Date().toISOString();
  const isActive = booleanValue(raw.is_active, true);
  const isArchived = booleanValue(raw.is_archived, !isActive);
  const version = Number.isInteger(raw.version) && Number(raw.version) > 0 ? Number(raw.version) : 1;

  const { error } = await admin.from('products').upsert(
    {
      id,
      business_id: businessId,
      category_id: nullableString(raw.category_id),
      name,
      barcode: nullableString(raw.barcode),
      sku: nullableString(raw.sku),
      selling_price: sellingPrice,
      cost_price: costPrice,
      image_url: nullableString(raw.image_url),
      is_active: isActive,
      is_archived: isArchived,
      version,
      description: nullableString(raw.description),
      created_at: createdAt,
      updated_at: updatedAt,
      created_by: nullableString(raw.created_by) ?? user.id,
      last_modified_by: user.id,
    },
    { onConflict: 'id' },
  );

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
