import {
  createClients,
  json,
  nullableString,
  numberValue,
  parsePayload,
  stringValue,
  tableRows,
  unwrapPayload,
} from './pos-sync.ts';

const COMMIT_SALE_VERSION = 'commit_sale_debug_2026-06-12_01';

function logCommitSale(stage: string, details?: Record<string, unknown>): void {
  if (details) {
    console.log(`[commit_sale:${COMMIT_SALE_VERSION}] ${stage}`, details);
    return;
  }

  console.log(`[commit_sale:${COMMIT_SALE_VERSION}] ${stage}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stageError(stage: string, error: unknown, details?: Record<string, unknown>): Response {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message)
    : errorMessage(error);
  logCommitSale(`${stage} failed`, { error: message, ...details });
  return json({ error: message, stage, version: COMMIT_SALE_VERSION, ...details }, 500);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  logCommitSale('request started', { method: request.method });
  const clients = await createClients(request);
  if ('error' in clients) {
    logCommitSale('create clients failed');
    return clients.error;
  }
  logCommitSale('clients ready', { userId: clients.user.id });

  const body = await request.json().catch(() => null);
  const raw = unwrapPayload(body);
  const sale = raw?.sale && typeof raw.sale === 'object' ? (raw.sale as Record<string, unknown>) : null;
  const saleId = stringValue(sale?.id);
  const businessId = stringValue(sale?.business_id);
  const branchId = stringValue(sale?.branch_id);
  const employeeId = stringValue(sale?.employee_id);

  if (!sale || !saleId || !businessId || !branchId || !employeeId) {
    logCommitSale('validation failed', {
      hasSale: Boolean(sale),
      saleId,
      businessId,
      branchId,
      employeeId,
    });
    return json({ error: 'sale id, business_id, branch_id, and employee_id are required' }, 400);
  }

  logCommitSale('payload parsed', {
    saleId,
    businessId,
    branchId,
    employeeId,
    idempotencyKey: nullableString(sale.idempotency_key) ?? null,
    saleItemCount: tableRows(raw?.sale_items).length,
    paymentCount: tableRows(raw?.payments).length,
    inventoryItemCount: tableRows(raw?.inventory_items).length,
    inventoryLogCount: tableRows(raw?.inventory_logs).length,
    auditLogCount: tableRows(raw?.audit_logs).length,
  });

  logCommitSale('membership lookup started', { saleId, businessId, userId: clients.user.id });
  const { data: membershipRows, error: membershipLookupError } = await clients.admin
    .from('business_members')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', clients.user.id)
    .eq('is_active', true)
    .limit(1);
  if (membershipLookupError) {
    return stageError('membership_lookup', membershipLookupError, { saleId, businessId, userId: clients.user.id });
  }
  if (!membershipRows?.[0]) {
    logCommitSale('membership rejected', { saleId, businessId, userId: clients.user.id });
    return json({
      error: 'forbidden',
      stage: 'membership_lookup',
      version: COMMIT_SALE_VERSION,
      saleId,
      businessId,
      userId: clients.user.id,
    }, 403);
  }
  logCommitSale('membership accepted', { saleId, businessId, userId: clients.user.id });

  const now = new Date().toISOString();
  logCommitSale('existing sale lookup started', {
    saleId,
    idempotencyKey: nullableString(sale.idempotency_key) ?? saleId,
  });
  const { data: existingSaleRows, error: existingSaleError } = await clients.admin
    .from('sales')
    .select('id')
    .or(`id.eq.${saleId},idempotency_key.eq.${nullableString(sale.idempotency_key) ?? saleId}`)
    .limit(1);
  if (existingSaleError) {
    return stageError('existing_sale_lookup', existingSaleError, { saleId });
  }
  const existingSale = existingSaleRows?.[0] ?? null;
  logCommitSale('existing sale lookup completed', {
    saleId,
    existingSaleId: existingSale?.id ?? null,
    resultCount: existingSaleRows?.length ?? 0,
  });

  if (!existingSale) {
    logCommitSale('sales upsert started', { saleId, businessId, branchId, employeeId });
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
      return stageError('sales_upsert', error, { saleId });
    }
    logCommitSale('sales upsert completed', { saleId });
  } else {
    logCommitSale('sales upsert skipped; sale already exists', { saleId });
  }

  const saleItems = tableRows(raw?.sale_items);
  for (const item of saleItems) {
    const saleItemId = stringValue(item.id);
    logCommitSale('sale item upsert started', { saleId, saleItemId, productId: stringValue(item.product_id) });
    const { error } = await clients.admin.from('sale_items').upsert(
      {
        id: saleItemId,
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
      return stageError('sale_items_upsert', error, { saleId, saleItemId });
    }
  }
  logCommitSale('sale items upsert completed', { saleId, count: saleItems.length });

  const payments = tableRows(raw?.payments);
  for (const payment of payments) {
    const paymentId = stringValue(payment.id);
    logCommitSale('payment upsert started', { saleId, paymentId, method: stringValue(payment.method) });
    const { error } = await clients.admin.from('payments').upsert(
      {
        id: paymentId,
        sale_id: saleId,
        business_id: businessId,
        method: stringValue(payment.method) ?? 'cash',
        amount_peso: numberValue(payment.amount_peso),
      },
      { onConflict: 'id' },
    );
    if (error) {
      return stageError('payments_upsert', error, { saleId, paymentId });
    }
  }
  logCommitSale('payments upsert completed', { saleId, count: payments.length });

  const inventoryItems = tableRows(raw?.inventory_items);
  for (const inventory of inventoryItems) {
    const inventoryId = stringValue(inventory.id);
    logCommitSale('inventory item upsert started', {
      saleId,
      inventoryId,
      productId: stringValue(inventory.product_id),
      branchId: stringValue(inventory.branch_id),
    });
    const { error } = await clients.admin.from('inventory_items').upsert(
      {
        id: inventoryId,
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
      return stageError('inventory_items_upsert', error, { saleId, inventoryId });
    }
  }
  logCommitSale('inventory items upsert completed', { saleId, count: inventoryItems.length });

  const inventoryLogs = tableRows(raw?.inventory_logs);
  for (const log of inventoryLogs) {
    const inventoryLogId = stringValue(log.id);
    logCommitSale('inventory log upsert started', {
      saleId,
      inventoryLogId,
      productId: stringValue(log.product_id),
      branchId: stringValue(log.branch_id),
    });
    const { error } = await clients.admin.from('inventory_logs').upsert(
      {
        id: inventoryLogId,
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
      return stageError('inventory_logs_upsert', error, { saleId, inventoryLogId });
    }
  }
  logCommitSale('inventory logs upsert completed', { saleId, count: inventoryLogs.length });

  const auditLogs = tableRows(raw?.audit_logs);
  for (const audit of auditLogs) {
    const auditLogId = stringValue(audit.id);
    logCommitSale('audit log upsert started', { saleId, auditLogId, eventType: stringValue(audit.event_type) });
    const { error } = await clients.admin.from('audit_logs').upsert(
      {
        id: auditLogId,
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
      return stageError('audit_logs_upsert', error, { saleId, auditLogId });
    }
  }
  logCommitSale('audit logs upsert completed', { saleId, count: auditLogs.length });

  logCommitSale('request completed', { saleId });
  return json({ ok: true });
});
