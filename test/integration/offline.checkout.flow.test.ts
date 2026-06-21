import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react-native';

import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useCart } from '@/hooks/useCart';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCartStore } from '@/store/cartStore';
import { useSyncStore } from '@/store/syncStore';
import {
  createCrudTransaction,
  executeMock,
  getOptionalMock,
  setPowerSyncStatus,
  setPowerSyncUploadQueueCount,
} from '../__mocks__/powersync';
import { mockSupabaseClient, setFunctionResult } from '../__mocks__/supabase';
import {
  createBranch,
  createBusiness,
  createInventoryItem,
  createPayment,
  createProduct,
  createSale,
  createSaleItem,
} from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

interface MockUploadDatabase {
  getNextCrudTransaction: jest.Mock<Promise<ReturnType<typeof createCrudTransaction> | null>, []>;
  getOptional: jest.Mock<Promise<Record<string, unknown> | null>, [string, unknown[]]>;
  execute: jest.Mock<Promise<void>, [string, unknown[]]>;
}

function createUploadDatabase(rowsByTable: Record<string, Record<string, unknown>>): MockUploadDatabase {
  const transaction = createCrudTransaction([
    { table: 'sales', op: 'PUT', id: 'sale-1' },
    { table: 'sale_items', op: 'PUT', id: 'sale-item-1' },
    { table: 'payments', op: 'PUT', id: 'payment-1' },
    { table: 'inventory_items', op: 'PUT', id: 'inventory-1' },
    { table: 'inventory_logs', op: 'PUT', id: 'inventory-log-1' },
    { table: 'audit_logs', op: 'PUT', id: 'audit-1' },
  ]);
  let transactionReturned = false;

  return {
    getNextCrudTransaction: jest.fn(async () => {
      if (transactionReturned) {
        return null;
      }
      transactionReturned = true;
      return transaction;
    }),
    getOptional: jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('sync_import_markers')) {
        return null;
      }
      const tableMatch = sql.match(/FROM\s+([a-z_]+)/i);
      const table = tableMatch?.[1] ?? '';
      const id = String(params[params.length - 1]);
      return rowsByTable[table]?.[id] ?? null;
    }),
    execute: jest.fn(async () => undefined),
  };
}

describe('offline checkout flow', () => {
  beforeEach(() => {
    resetAllStores();
    const business = createBusiness({ id: 'business-1' });
    const branch = createBranch({ id: 'branch-1', business_id: business.id });

    useAuthStore.setState({
      status: 'signed_in',
      userId: 'employee-1',
      email: 'employee@example.com',
      fullname: 'Employee One',
      role: 'employee',
      accessToken: 'access-token',
      error: null,
    });
    useBusinessStore.setState({
      activeBusiness: business,
      activeBranch: branch,
      availableBusinesses: [],
    });
  });

  it('shows pending queued primary-table writes while offline', async () => {
    setPowerSyncStatus({ connected: false });
    setPowerSyncUploadQueueCount(1);
    useSyncStore.setState({
      phase: 'offline',
      isOnline: false,
      pendingUploadCount: 1,
    });

    await render(React.createElement(SyncStatusBadge));

    expect(screen.getByLabelText('Sync status')).toHaveTextContent('Offline - 1 queued');
  });

  it('completes checkout offline through local primary-table writes', async () => {
    setPowerSyncStatus({ connected: false });
    useSyncStore.setState({ phase: 'offline', isOnline: false });
    getOptionalMock.mockImplementation(async (sql: string) => {
      if (sql.includes('inventory_items') || sql.includes('fallback_inventory_items')) {
        return createInventoryItem({
          id: 'inventory-1',
          product_id: 'product-1',
          branch_id: 'branch-1',
          business_id: 'business-1',
          stock_quantity: 10,
        });
      }
      return null;
    });
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 125 }), 2);

    const { result } = await renderHook(() => useCart());

    await act(async () => {
      await expect(result.current.checkout('cash', [{ method: 'cash', amount_peso: 250 }], 'offline-checkout')).resolves.toEqual(
        expect.any(String),
      );
    });

    const executedSql = executeMock.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toContain('INSERT INTO sales');
    expect(executedSql).toContain('INSERT INTO sale_items');
    expect(executedSql).toContain('INSERT INTO payments');
    expect(executedSql).toContain('UPDATE inventory_items SET stock_quantity');
    expect(executedSql).toContain('INSERT INTO inventory_logs');
    expect(executedSql).toContain('INSERT INTO audit_logs');
    expect(executedSql).not.toContain('INSERT INTO fallback_sales');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('bundles queued primary-table CRUD rows into commit_sale when connectivity returns', async () => {
    const sale = createSale({
      id: 'sale-1',
      business_id: 'business-1',
      branch_id: 'branch-1',
      employee_id: 'employee-1',
      idempotency_key: 'idem-1',
    });
    const saleItem = createSaleItem({
      id: 'sale-item-1',
      sale_id: sale.id,
      product_id: 'product-1',
    });
    const payment = createPayment({
      id: 'payment-1',
      sale_id: sale.id,
      business_id: sale.business_id,
    });
    const inventoryItem = createInventoryItem({
      id: 'inventory-1',
      product_id: 'product-1',
      branch_id: sale.branch_id,
      business_id: sale.business_id,
    });
    const inventoryLog = {
      id: 'inventory-log-1',
      product_id: 'product-1',
      branch_id: sale.branch_id,
      reference_id: sale.id,
    };
    const auditLog = {
      id: 'audit-1',
      payload: JSON.stringify({ saleId: sale.id }),
    };
    const database = createUploadDatabase({
      sales: { [sale.id]: sale },
      sale_items: { [saleItem.id]: saleItem },
      payments: { [payment.id]: payment },
      inventory_items: { [inventoryItem.id]: inventoryItem },
      inventory_logs: { [inventoryLog.id]: inventoryLog },
      audit_logs: { [auditLog.id]: auditLog },
    });

    jest.resetModules();
    jest.doMock('@/services/supabaseClient', () => ({
      getSupabaseClient: () => mockSupabaseClient,
    }));
    jest.doMock('../../src/services/supabaseClient', () => ({
      getSupabaseClient: () => mockSupabaseClient,
    }));
    jest.doMock('@/store/authStore', () => ({
      useAuthStore: {
        getState: () => ({
          accessToken: 'access-token',
          userId: 'employee-1',
        }),
      },
    }));
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: () => mockSupabaseClient,
    }));
    const { SupabasePowerSyncConnector } = require('@/powersync/connector') as typeof import('@/powersync/connector');
    await new SupabasePowerSyncConnector().uploadData(database as never);

    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      'commit_sale',
      expect.objectContaining({
        body: expect.objectContaining({
          payload: expect.objectContaining({
            sale: expect.objectContaining({ idempotency_key: 'idem-1' }),
            sale_items: [expect.objectContaining({ id: 'sale-item-1' })],
            payments: [expect.objectContaining({ id: 'payment-1' })],
            inventory_items: [expect.objectContaining({ id: 'inventory-1' })],
            inventory_logs: [expect.objectContaining({ id: 'inventory-log-1' })],
            audit_logs: [expect.objectContaining({ id: 'audit-1' })],
          }),
        }),
      }),
    );
    const firstTransaction = await database.getNextCrudTransaction.mock.results[0].value;
    expect(firstTransaction?.complete).toHaveBeenCalled();
    expect(database.execute).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sales SET'),
      expect.anything(),
    );
  });

  it('classifies failed commit_sale uploads without completing the queued transaction', async () => {
    const sale = createSale({
      id: 'sale-1',
      business_id: 'business-1',
      branch_id: 'branch-1',
      employee_id: 'employee-1',
      idempotency_key: 'idem-1',
    });
    const database = createUploadDatabase({
      sales: { [sale.id]: sale },
      sale_items: {
        'sale-item-1': createSaleItem({
          id: 'sale-item-1',
          sale_id: sale.id,
          product_id: 'product-1',
        }),
      },
      payments: {
        'payment-1': createPayment({
          id: 'payment-1',
          sale_id: sale.id,
          business_id: sale.business_id,
        }),
      },
      inventory_items: {
        'inventory-1': createInventoryItem({
          id: 'inventory-1',
          product_id: 'product-1',
          branch_id: sale.branch_id,
          business_id: sale.business_id,
        }),
      },
      inventory_logs: {
        'inventory-log-1': {
          id: 'inventory-log-1',
          product_id: 'product-1',
          branch_id: sale.branch_id,
          reference_id: sale.id,
        },
      },
      audit_logs: {
        'audit-1': {
          id: 'audit-1',
          payload: JSON.stringify({ saleId: sale.id }),
        },
      },
    });

    setFunctionResult('commit_sale', {
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 422,
          statusText: 'Unprocessable Entity',
          clone() {
            return {
              async text() {
                return '{"code":"VALIDATION_FAILED","message":"payment total does not match sale total"}';
              },
            };
          },
        },
      },
    });

    jest.resetModules();
    jest.doMock('@/services/supabaseClient', () => ({
      getSupabaseClient: () => mockSupabaseClient,
    }));
    jest.doMock('../../src/services/supabaseClient', () => ({
      getSupabaseClient: () => mockSupabaseClient,
    }));
    jest.doMock('@/store/authStore', () => ({
      useAuthStore: {
        getState: () => ({
          accessToken: 'access-token',
          userId: 'employee-1',
        }),
      },
    }));
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: () => mockSupabaseClient,
    }));

    const { SupabasePowerSyncConnector } = require('@/powersync/connector') as typeof import('@/powersync/connector');
    await expect(new SupabasePowerSyncConnector().uploadData(database as never)).rejects.toThrow(
      'validation_failed',
    );

    const firstTransaction = await database.getNextCrudTransaction.mock.results[0].value;
    expect(firstTransaction?.complete).not.toHaveBeenCalled();
    expect(database.execute).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sales SET'),
      expect.anything(),
    );
  });
});
