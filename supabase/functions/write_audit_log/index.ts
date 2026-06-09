import {
  createClients,
  json,
  nullableString,
  parsePayload,
  requireMembership,
  stringValue,
  unwrapPayload,
} from './pos-sync.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const clients = await createClients(request);
  if ('error' in clients) {
    return clients.error;
  }

  const body = await request.json().catch(() => null);
  const raw = unwrapPayload(body);
  const businessId = stringValue(raw?.business_id);
  if (!raw || !businessId || !stringValue(raw.id)) {
    return json({ error: 'id and business_id are required' }, 400);
  }

  const membershipError = await requireMembership(clients.admin, businessId, clients.user.id);
  if (membershipError) {
    return membershipError;
  }

  const { error } = await clients.admin.from('audit_logs').upsert(
    {
      id: stringValue(raw.id),
      business_id: businessId,
      branch_id: nullableString(raw.branch_id),
      actor_id: stringValue(raw.actor_id) ?? clients.user.id,
      event_type: stringValue(raw.event_type) ?? 'login',
      payload: parsePayload(raw.payload),
      created_at: stringValue(raw.created_at) ?? new Date().toISOString(),
      source_device_id: nullableString(raw.source_device_id),
    },
    { onConflict: 'id' },
  );

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
