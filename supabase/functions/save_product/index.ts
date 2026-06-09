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

function requiredString(incoming: unknown, existing: unknown): string {
  const incomingValue = typeof incoming === 'string' ? incoming.trim() : '';
  if (incomingValue) {
    return incomingValue;
  }

  return typeof existing === 'string' ? existing.trim() : '';
}

function requiredNumber(incoming: unknown, existing: unknown): number {
  const incomingValue = typeof incoming === 'number' ? incoming : Number(incoming);
  if (Number.isFinite(incomingValue)) {
    return incomingValue;
  }

  const existingValue = typeof existing === 'number' ? existing : Number(existing);
  return Number.isFinite(existingValue) ? existingValue : Number.NaN;
}

function validatePrice(price: number): { isValid: boolean; error?: string } {
  const MAX_PRICE = 9999999999.99;
  const MIN_PRICE = 0;

  if (!Number.isFinite(price)) {
    return { isValid: false, error: 'Price must be a valid number' };
  }

  if (price < MIN_PRICE) {
    return { isValid: false, error: 'Price cannot be negative' };
  }

  if (price > MAX_PRICE) {
    return { isValid: false, error: `Price cannot exceed ${MAX_PRICE.toLocaleString()}` };
  }

  // Check decimal places (max 2)
  const decimalPlaces = (price.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Price can have a maximum of 2 decimal places' };
  }

  return { isValid: true };
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

  const { data: existingProduct, error: existingProductError } = await admin
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (existingProductError) {
    return json({ error: existingProductError.message }, 500);
  }

  const merged = {
    ...(existingProduct ?? {}),
    ...raw,
    id,
  };
  const businessId = requiredString(raw.business_id, existingProduct?.business_id) || null;
  const name = requiredString(raw.name, existingProduct?.name);
  const sellingPrice = requiredNumber(raw.selling_price, existingProduct?.selling_price);
  const costPrice = requiredNumber(raw.cost_price, existingProduct?.cost_price);

  // Check for missing required fields
  if (!businessId) {
    return json({ error: 'business_id is required' }, 400);
  }
  if (!name) {
    return json({ error: 'product name is required' }, 400);
  }
  if (!Number.isFinite(sellingPrice)) {
    return json({ error: 'selling_price must be a valid number' }, 400);
  }
  if (!Number.isFinite(costPrice)) {
    return json({ error: 'cost_price must be a valid number' }, 400);
  }

  // Validate prices are within NUMERIC(12,2) constraint
  const sellingPriceValidation = validatePrice(sellingPrice);
  if (!sellingPriceValidation.isValid) {
    return json(
      {
        error: `Invalid selling price: ${sellingPriceValidation.error} (received: ${sellingPrice})`,
      },
      400,
    );
  }

  const costPriceValidation = validatePrice(costPrice);
  if (!costPriceValidation.isValid) {
    return json(
      {
        error: `Invalid cost price: ${costPriceValidation.error} (received: ${costPrice})`,
      },
      400,
    );
  }

  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .maybeSingle();
  if (businessError) {
    return json({ error: businessError.message }, 500);
  }
  const isBusinessOwner = business?.owner_id === user.id;

  const { data: membership, error: membershipError } = await admin
    .from('business_members')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('role', 'owner')
    .maybeSingle();

  if (membershipError) {
    return json({ error: membershipError.message }, 500);
  }
  if (!isBusinessOwner && !membership) {
    return json({ error: 'forbidden' }, 403);
  }

  const createdAt = typeof merged.created_at === 'string' ? merged.created_at : new Date().toISOString();
  const updatedAt = typeof merged.updated_at === 'string' ? merged.updated_at : new Date().toISOString();
  const isActive = booleanValue(merged.is_active, true);
  const isArchived = booleanValue(merged.is_archived, !isActive);
  const versionValue = Number(merged.version);
  const version = Number.isInteger(versionValue) && versionValue > 0 ? versionValue : 1;

  const { error } = await admin.from('products').upsert(
    {
      id,
      business_id: businessId,
      category_id: nullableString(merged.category_id),
      name,
      barcode: nullableString(merged.barcode),
      sku: nullableString(merged.sku),
      selling_price: sellingPrice,
      cost_price: costPrice,
      image_url: nullableString(merged.image_url),
      is_active: isActive,
      is_archived: isArchived,
      version,
      description: nullableString(merged.description),
      created_at: createdAt,
      updated_at: updatedAt,
      created_by: nullableString(merged.created_by) ?? user.id,
      last_modified_by: user.id,
    },
    { onConflict: 'id' },
  );

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
