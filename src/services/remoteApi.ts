import { getSupabaseClient } from '@/services/supabaseClient';
import { logBusinessRefreshDebug } from '@/utils/syncDebug';

export interface RemoteMutationResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
    request_id?: string;
  };
}

async function invokeEdgeFunction(functionName: string, payload: Record<string, unknown>): Promise<RemoteMutationResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      error: {
        code: 'SYNC_NOT_READY',
        message: 'Supabase is not configured.',
        retryable: true,
      },
    };
  }

  const { data, error } = await client.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    return {
      ok: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
        retryable: true,
      },
    };
  }

  return (data as RemoteMutationResult) ?? {
    ok: true,
    data: {},
  };
}

function requireQueryData<T>(
  label: string,
  result: {
    data: T[] | null;
    error: { message: string } | null;
  },
): T[] {
  if (result.error) {
    throw new Error(`Failed to fetch ${label}: ${result.error.message}`);
  }

  return result.data ?? [];
}

function isMissingTableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('schema cache') || normalized.includes('does not exist');
}

function optionalQueryData<T>(
  label: string,
  result: {
    data: T[] | null;
    error: { message: string } | null;
  },
): T[] {
  if (!result.error) {
    return result.data ?? [];
  }

  if (isMissingTableError(result.error.message)) {
    console.warn(`[business] optional table ${label} is unavailable: ${result.error.message}`);
    return [];
  }

  throw new Error(`Failed to fetch ${label}: ${result.error.message}`);
}

export async function fetchInitialBootstrapSnapshot() {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const [
    businesses,
    branches,
    businessMembers,
    categories,
    products,
    inventory,
    sales,
    saleItems,
    payments,
    refunds,
    refundItems,
    inventoryLogs,
    auditLogs,
    deviceSessions,
    profiles,
  ] = await Promise.all([
    client.from('businesses').select('*'),
    client.from('branches').select('*'),
    client.from('business_members').select('*'),
    client.from('categories').select('*'),
    client.from('products').select('*'),
    client.from('inventory_items').select('*'),
    client.from('sales').select('*'),
    client.from('sale_items').select('*'),
    client.from('payments').select('*'),
    client.from('refunds').select('*'),
    client.from('refund_items').select('*'),
    client.from('inventory_logs').select('*'),
    client.from('audit_logs').select('*'),
    client.from('device_sessions').select('*'),
    client.from('profiles').select('*'),
  ]);

  return {
    businesses: businesses.data ?? [],
    branches: branches.data ?? [],
    businessMembers: businessMembers.data ?? [],
    categories: categories.data ?? [],
    products: products.data ?? [],
    inventory: inventory.data ?? [],
    sales: sales.data ?? [],
    saleItems: saleItems.data ?? [],
    payments: payments.data ?? [],
    refunds: refunds.data ?? [],
    refundItems: refundItems.data ?? [],
    inventoryLogs: inventoryLogs.data ?? [],
    auditLogs: auditLogs.data ?? [],
    deviceSessions: optionalQueryData('device sessions', deviceSessions),
    profiles: profiles.data ?? [],
  };
}

function logQueryResult(
  traceId: string | null | undefined,
  label: string,
  result: { data: unknown[] | null; error: { message: string } | null },
): void {
  logBusinessRefreshDebug(traceId, `query ${label}`, {
    count: result.data?.length ?? 0,
    error: result.error?.message ?? null,
  });
}

export async function fetchBusinessBootstrapSnapshot(businessId: string, traceId?: string) {
  const client = getSupabaseClient();
  if (!client) {
    logBusinessRefreshDebug(traceId, 'fetch skipped; Supabase client unavailable', { businessId });
    return null;
  }

  logBusinessRefreshDebug(traceId, 'fetch started', { businessId });
  const [
    businesses,
    branches,
    businessMembers,
    categories,
    products,
    inventory,
    sales,
    saleItems,
    payments,
    refunds,
    inventoryLogs,
    auditLogs,
    deviceSessions,
  ] = await Promise.all([
    client.from('businesses').select('*').eq('id', businessId),
    client.from('branches').select('*').eq('business_id', businessId),
    client.from('business_members').select('*').eq('business_id', businessId),
    client.from('categories').select('*').eq('business_id', businessId),
    client.from('products').select('*').eq('business_id', businessId),
    client.from('inventory_items').select('*').eq('business_id', businessId),
    client.from('sales').select('*').eq('business_id', businessId),
    client.from('sale_items').select('*').eq('business_id', businessId),
    client.from('payments').select('*').eq('business_id', businessId),
    client.from('refunds').select('*').eq('business_id', businessId),
    client.from('inventory_logs').select('*'),
    client.from('audit_logs').select('*').eq('business_id', businessId),
    client.from('device_sessions').select('*').eq('business_id', businessId),
  ]);

  logQueryResult(traceId, 'businesses', businesses);
  logQueryResult(traceId, 'branches', branches);
  logQueryResult(traceId, 'business_members', businessMembers);
  logQueryResult(traceId, 'categories', categories);
  logQueryResult(traceId, 'products', products);
  logQueryResult(traceId, 'inventory_items', inventory);
  logQueryResult(traceId, 'sales', sales);
  logQueryResult(traceId, 'sale_items', saleItems);
  logQueryResult(traceId, 'payments', payments);
  logQueryResult(traceId, 'refunds', refunds);
  logQueryResult(traceId, 'inventory_logs', inventoryLogs);
  logQueryResult(traceId, 'audit_logs', auditLogs);
  logQueryResult(traceId, 'device_sessions', deviceSessions);

  const businessRows = requireQueryData('businesses', businesses);
  const branchRows = requireQueryData('branches', branches);
  const businessMemberRows = requireQueryData('business members', businessMembers);
  const categoryRows = requireQueryData('categories', categories);
  const productRows = requireQueryData('products', products);
  const inventoryRows = requireQueryData('inventory items', inventory);
  const saleRows = requireQueryData('sales', sales);
  const saleItemRows = requireQueryData('sale items', saleItems);
  const paymentRows = requireQueryData('payments', payments);
  const refundRows = requireQueryData('refunds', refunds);
  const refundIds = refundRows.map((refund) => refund.id);
  const refundItems =
    refundIds.length > 0
      ? await client.from('refund_items').select('*').in('refund_id', refundIds)
      : { data: [], error: null };
  const refundItemRows = requireQueryData('refund items', refundItems);
  const inventoryLogRows = requireQueryData('inventory logs', inventoryLogs);
  const auditLogRows = requireQueryData('audit logs', auditLogs);
  const deviceSessionRows = optionalQueryData('device sessions', deviceSessions);

  const productIds = new Set(productRows.map((product) => product.id));
  const branchIds = new Set(branchRows.map((branch) => branch.id));

  console.log(
    `[business] fetched ${productRows.length} product rows from database for business ${businessId} ` +
      `(businesses=${businessRows.length}, members=${businessMemberRows.length}, branches=${branchRows.length})`,
  );
  logBusinessRefreshDebug(traceId, 'fetch completed', {
    businessId,
    products: productRows.length,
    inventory: inventoryRows.length,
    branches: branchRows.length,
    members: businessMemberRows.length,
  });

  return {
    businesses: businessRows,
    branches: branchRows,
    businessMembers: businessMemberRows,
    categories: categoryRows,
    products: productRows,
    inventory: inventoryRows,
    sales: saleRows,
    saleItems: saleItemRows,
    payments: paymentRows,
    refunds: refundRows,
    refundItems: refundItemRows,
    inventoryLogs: inventoryLogRows.filter(
      (log) => productIds.has(log.product_id) || branchIds.has(log.branch_id),
    ),
    auditLogs: auditLogRows,
    deviceSessions: deviceSessionRows,
  };
}
