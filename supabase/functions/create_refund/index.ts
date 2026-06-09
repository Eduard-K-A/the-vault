import {
  createClients,
  json,
  nullableString,
  numberValue,
  parsePayload,
  requireMembership,
  stringValue,
  tableRows,
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
  const refund = raw?.refund && typeof raw.refund === 'object' ? (raw.refund as Record<string, unknown>) : null;
  const refundId = stringValue(refund?.id);
  const businessId = stringValue(refund?.business_id);
  const branchId = stringValue(refund?.branch_id);

  if (!refund || !refundId || !businessId || !branchId) {
    return json({ error: 'refund id, business_id, and branch_id are required' }, 400);
  }

  const membershipError = await requireMembership(clients.admin, businessId, clients.user.id);
  if (membershipError) {
    return membershipError;
  }

  const now = new Date().toISOString();
  const { error: refundError } = await clients.admin.from('refunds').upsert(
    {
      id: refundId,
      idempotency_key: nullableString(refund.idempotency_key) ?? refundId,
      original_sale_id: stringValue(refund.original_sale_id),
      branch_id: branchId,
      business_id: businessId,
      reason: stringValue(refund.reason) ?? 'Refund',
      total_peso: numberValue(refund.total_peso),
      created_at: stringValue(refund.created_at) ?? now,
      created_by: stringValue(refund.created_by) ?? clients.user.id,
      source_device_id: stringValue(refund.source_device_id) ?? 'unknown',
      reference_number: stringValue(refund.reference_number) ?? refundId,
    },
    { onConflict: 'id' },
  );
  if (refundError) {
    return json({ error: refundError.message }, 500);
  }

  for (const item of tableRows(raw?.refund_items)) {
    const { error } = await clients.admin.from('refund_items').upsert(
      {
        id: stringValue(item.id),
        refund_id: refundId,
        sale_item_id: stringValue(item.sale_item_id),
        product_id: stringValue(item.product_id),
        quantity: numberValue(item.quantity),
        unit_price: numberValue(item.unit_price),
        subtotal: numberValue(item.subtotal),
      },
      { onConflict: 'id' },
    );
    if (error) {
      return json({ error: error.message }, 500);
    }
  }

  for (const inventory of tableRows(raw?.inventory_items)) {
    const { error } = await clients.admin.from('inventory_items').upsert(
      {
        id: stringValue(inventory.id),
        product_id: stringValue(inventory.product_id),
        branch_id: stringValue(inventory.branch_id),
        business_id: businessId,
        stock_quantity: numberValue(inventory.stock_quantity),
        low_stock_threshold: numberValue(inventory.low_stock_threshold, 5),
        updated_at: stringValue(inventory.updated_at) ?? now,
      },
      { onConflict: 'product_id,branch_id' },
    );
    if (error) {
      return json({ error: error.message }, 500);
    }
  }

  for (const log of tableRows(raw?.inventory_logs)) {
    const { error } = await clients.admin.from('inventory_logs').upsert(
      {
        id: stringValue(log.id),
        product_id: stringValue(log.product_id),
        branch_id: stringValue(log.branch_id),
        action_type: stringValue(log.action_type) ?? 'refund',
        quantity_before: numberValue(log.quantity_before),
        quantity_changed: numberValue(log.quantity_changed),
        quantity_after: numberValue(log.quantity_after),
        reference_type: stringValue(log.reference_type) ?? 'sale',
        reference_id: nullableString(log.reference_id) ?? refundId,
        performed_by: stringValue(log.performed_by) ?? clients.user.id,
        created_at: stringValue(log.created_at) ?? now,
      },
      { onConflict: 'id' },
    );
    if (error) {
      return json({ error: error.message }, 500);
    }
  }

  const originalSaleId = stringValue(refund.original_sale_id);
  if (originalSaleId) {
    const { error } = await clients.admin.from('sales').update({ status: 'refunded' }).eq('id', originalSaleId);
    if (error) {
      return json({ error: error.message }, 500);
    }
  }

  for (const audit of tableRows(raw?.audit_logs)) {
    const { error } = await clients.admin.from('audit_logs').upsert(
      {
        id: stringValue(audit.id),
        business_id: businessId,
        branch_id: nullableString(audit.branch_id),
        actor_id: stringValue(audit.actor_id) ?? clients.user.id,
        event_type: stringValue(audit.event_type) ?? 'sale_refunded',
        payload: parsePayload(audit.payload),
        created_at: stringValue(audit.created_at) ?? now,
        source_device_id: nullableString(audit.source_device_id),
      },
      { onConflict: 'id' },
    );
    if (error) {
      return json({ error: error.message }, 500);
    }
  }

  return json({ ok: true });
});
