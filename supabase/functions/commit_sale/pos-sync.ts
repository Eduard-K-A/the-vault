import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { selectActiveMembership } from '../_shared/membership.ts';

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function unwrapPayload(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const envelope = body as Record<string, unknown>;
  return envelope.payload && typeof envelope.payload === 'object'
    ? (envelope.payload as Record<string, unknown>)
    : envelope;
}

export function tableRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object') : [];
}

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function nullableString(value: unknown): string | null {
  return typeof value === 'string' || value === null ? value : null;
}

export function numberValue(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function parsePayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function createClients(request: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorization = request.headers.get('authorization') ?? '';

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { error: json({ error: 'server_not_configured' }, 500) };
  }
  if (!authorization) {
    return { error: json({ error: 'unauthorized' }, 401) };
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
    return { error: json({ error: 'unauthorized' }, 401) };
  }

  return {
    user,
    admin: createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    }),
  };
}

export async function requireMembership(admin: any, businessId: string, userId: string): Promise<Response | null> {
  const { data, error } = await selectActiveMembership(admin, businessId, userId);

  if (error) {
    return json({ error: error.message }, 500);
  }

  return data ? null : json({ error: 'forbidden' }, 403);
}
