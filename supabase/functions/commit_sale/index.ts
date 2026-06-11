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
  const sale = raw?.sale && typeof raw.sale === 'object' ? (raw.sale as Record<string, unknown>) : null;
  const saleId = stringValue(sale?.id);
  const businessId = stringValue(sale?.business_id);
  const branchId = stringValue(sale?.branch_id);
  const employeeId = stringValue(sale?.employee_id);

  if (!sale || !saleId || !businessId || !branchId || !employeeId) {
    return json({ error: 'sale id, business_id, branch_id, and employee_id are required' }, 400);
  }

  const membershipError = await requireMembership(clients.admin, businessId, clients.user.id);
  if (membershipError) {
    return membershipError;
  }

  const now = new Date().toISOString();
  const { data: existingSale, error: existingSaleError } = await clients.admin
    .from('sales')
    .select('id')
    .or(`id.eq.${saleId},idempotency_key.eq.${nullableString(sale.idempotency_key) ?? saleId}`)
    .maybeSingle();
  if (existingSaleError) {
    return json({ error: existingSaleError.message }, 500);
  }

  if (!existingSale) {
    const { error } = await clients.admin.from('sales').upsert(
      {
        id: saleId,
        business_id: businessId,
        branch_id: branchId,
        employee_id: employeeId,
        total_amount: numberValue(sale.total_amount),
        discount_amount: numberValue(sale.discount_amount),
        payment_method: stringValue(sale.payment_method) ?? 'cash',
        status: stringValue(sale.status) ?? 'completed',
        notes: nullableString(sale.notes),
        created_at: stringValue(sale.created_at) ?? now,
        synced_at: now,
        reference_number: nullableString(sale.reference_number),
        vat_amount: numberValue(sale.vat_amount),
        idempotency_key: nullableString(sale.idempotency_key) ?? saleId,
      },
      { onConflict: 'id' },
    );
    if (error) {
      return json({ error: error.message }, 500);
    }
  }

  for (const item of tableRows(raw?.sale_items)) {
    const { error } = await clients.admin.from('sale_items').upsert(
      {
        id: stringValue(item.id),
        sale_id: saleId,
        product_id: stringValue(item.product_id),
        business_id: businessId,
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

  for (const payment of tableRows(raw?.payments)) {
    const { error } = await clients.admin.from('payments').upsert(
      {
        id: stringValue(payment.id),
        sale_id: saleId,
        business_id: businessId,
        method: stringValue(payment.method) ?? 'cash',
        amount_peso: numberValue(payment.amount_peso),
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
      { onConflict: 'id' },
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
        action_type: stringValue(log.action_type) ?? 'sale',
        quantity_before: numberValue(log.quantity_before),
        quantity_changed: numberValue(log.quantity_changed),
        quantity_after: numberValue(log.quantity_after),
        reference_type: stringValue(log.reference_type) ?? 'sale',
        reference_id: nullableString(log.reference_id) ?? saleId,
        performed_by: stringValue(log.performed_by) ?? employeeId,
        created_at: stringValue(log.created_at) ?? now,
      },
      { onConflict: 'id' },
    );
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
        actor_id: stringValue(audit.actor_id) ?? employeeId,
        event_type: stringValue(audit.event_type) ?? 'sale_created',
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
