import {
  createClients,
  json,
  nullableString,
  numberValue,
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
  const log = raw?.inventory_log && typeof raw.inventory_log === 'object' ? (raw.inventory_log as Record<string, unknown>) : null;
  const inventory = raw?.inventory_item && typeof raw.inventory_item === 'object' ? (raw.inventory_item as Record<string, unknown>) : null;
  const businessId = stringValue(inventory?.business_id);
  const branchId = stringValue(log?.branch_id) ?? stringValue(inventory?.branch_id);
  const productId = stringValue(log?.product_id) ?? stringValue(inventory?.product_id);

  if (!log || !inventory || !businessId || !branchId || !productId) {
    return json({ error: 'inventory_log and inventory_item with business_id, branch_id, and product_id are required' }, 400);
  }

  const membershipError = await requireMembership(clients.admin, businessId, clients.user.id);
  if (membershipError) {
    return membershipError;
  }

  const now = new Date().toISOString();
  const { error: inventoryError } = await clients.admin.from('inventory_items').upsert(
    {
      id: stringValue(inventory.id),
      product_id: productId,
      branch_id: branchId,
      business_id: businessId,
      stock_quantity: numberValue(inventory.stock_quantity),
      low_stock_threshold: numberValue(inventory.low_stock_threshold, 5),
      updated_at: stringValue(inventory.updated_at) ?? now,
    },
    { onConflict: 'product_id,branch_id' },
  );
  if (inventoryError) {
    return json({ error: inventoryError.message }, 500);
  }

  const { error: logError } = await clients.admin.from('inventory_logs').upsert(
    {
      id: stringValue(log.id),
      product_id: productId,
      branch_id: branchId,
      action_type: stringValue(log.action_type) ?? 'adjustment',
      quantity_before: numberValue(log.quantity_before),
      quantity_changed: numberValue(log.quantity_changed),
      quantity_after: numberValue(log.quantity_after),
      reference_type: stringValue(log.reference_type) ?? 'manual',
      reference_id: nullableString(log.reference_id),
      performed_by: stringValue(log.performed_by) ?? clients.user.id,
      created_at: stringValue(log.created_at) ?? now,
    },
    { onConflict: 'id' },
  );
  if (logError) {
    return json({ error: logError.message }, 500);
  }

  return json({ ok: true });
});
