import { getSupabaseClient } from '@/services/supabaseClient';

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
    deviceSessions: deviceSessions.data ?? [],
    profiles: profiles.data ?? [],
  };
}
