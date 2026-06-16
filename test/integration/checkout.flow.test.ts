import { act, renderHook } from '@testing-library/react-native';

import { useCart } from '@/hooks/useCart';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCartStore } from '@/store/cartStore';
import { createBranch, createBusiness, createInventoryItem, createProduct } from '../factories/models';
import { executeMock, getOptionalMock } from '../__mocks__/powersync';
import { resetAllStores } from '../helpers/resetStores';

function arrangeSignedInCheckoutContext(): void {
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
}

describe('checkout flow', () => {
  beforeEach(() => {
    resetAllStores();
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
  });

  it('writes sale rows, payments, inventory logs, and audit logs in one local transaction', async () => {
    arrangeSignedInCheckoutContext();
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 112 }), 2);

    const { result } = await renderHook(() => useCart());
    let saleId = '';

    await act(async () => {
      saleId = await result.current.checkout('cash', [{ method: 'cash', amount_peso: 224 }], 'test-checkout');
    });

    const executedSql = executeMock.mock.calls.map(([sql]) => sql).join('\n');
    expect(saleId).toEqual(expect.any(String));
    expect(executedSql).toContain('INSERT INTO sales');
    expect(executedSql).toContain('INSERT INTO sale_items');
    expect(executedSql).toContain('INSERT INTO payments');
    expect(executedSql).toContain('UPDATE inventory_items SET stock_quantity');
    expect(executedSql).toContain('INSERT INTO inventory_logs');
    expect(executedSql).toContain('INSERT INTO audit_logs');
    expect(useCartStore.getState().items).toEqual([]);

    const saleInsertCall = executeMock.mock.calls.find(([sql]) => sql.includes('INSERT INTO sales'));
    expect(saleInsertCall?.[1]).toEqual(
      expect.arrayContaining([
        'business-1',
        'branch-1',
        'employee-1',
        224,
        expect.any(String),
      ]),
    );
    const inventoryLogCall = executeMock.mock.calls.find(([sql]) => sql.includes('INSERT INTO inventory_logs'));
    expect(inventoryLogCall?.[0]).toContain('business_id');
    expect(inventoryLogCall?.[0]).toContain('reason');
    expect(inventoryLogCall?.[0]).toContain('synced_at');
    expect(inventoryLogCall?.[1]).toEqual(expect.arrayContaining(['business-1', 'sale checkout', null]));
  });

  it('marks locally completed sales as pending sync without changing business status', async () => {
    arrangeSignedInCheckoutContext();
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 112 }), 1);

    const { result } = await renderHook(() => useCart());

    await act(async () => {
      await result.current.checkout('cash', [{ method: 'cash', amount_peso: 112 }], 'sync-lifecycle');
    });

    const saleInsertCall = executeMock.mock.calls.find(([sql]) => sql.includes('INSERT INTO sales'));
    expect(saleInsertCall?.[0]).toContain('sync_status');
    expect(saleInsertCall?.[0]).toContain('sync_attempt_count');
    expect(saleInsertCall?.[1]).toEqual(expect.arrayContaining(['completed', 'sync_pending', 0]));
  });

  it('rejects a duplicate checkout while the local transaction is committing', async () => {
    arrangeSignedInCheckoutContext();
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 1);

    let releaseInventoryLookup!: () => void;
    let delayedFirstInventoryLookup = false;
    const inventoryLookupStarted = new Promise<void>((resolve) => {
      getOptionalMock.mockImplementation(async (sql: string) => {
        if (sql.includes('inventory_items') || sql.includes('fallback_inventory_items')) {
          if (!delayedFirstInventoryLookup) {
            delayedFirstInventoryLookup = true;
            resolve();
            await new Promise<void>((release) => {
              releaseInventoryLookup = release;
            });
          }
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
    });

    const { result } = await renderHook(() => useCart());
    const firstCheckout = result.current.checkout('cash', [{ method: 'cash', amount_peso: 100 }], 'first-checkout');
    await inventoryLookupStarted;

    await expect(
      result.current.checkout('cash', [{ method: 'cash', amount_peso: 100 }], 'duplicate-checkout'),
    ).rejects.toThrow('CHECKOUT_IN_PROGRESS');

    releaseInventoryLookup();
    await act(async () => {
      await firstCheckout;
    });

    const saleInsertCalls = executeMock.mock.calls.filter(([sql]) => sql.includes('INSERT INTO sales'));
    expect(saleInsertCalls).toHaveLength(1);
  });

  it('persists split payments as separate payment rows', async () => {
    arrangeSignedInCheckoutContext();
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 1);

    const { result } = await renderHook(() => useCart());

    await act(async () => {
      await result.current.checkout(
        'cash',
        [
          { method: 'cash', amount_peso: 60 },
          { method: 'gcash', amount_peso: 40 },
        ],
        'split-payment',
      );
    });

    const paymentCalls = executeMock.mock.calls.filter(([sql]) => sql.includes('INSERT INTO payments'));
    expect(paymentCalls).toHaveLength(2);
    expect(paymentCalls[0][0]).toContain('status');
    expect(paymentCalls[0][0]).toContain('provider');
    expect(paymentCalls[0][0]).toContain('offline_approved');
    expect(paymentCalls[0][1]).toEqual(expect.arrayContaining(['cash', 60]));
    expect(paymentCalls[1][1]).toEqual(expect.arrayContaining(['gcash', 40]));
  });

  it('blocks checkout when split payment totals do not cover the sale total', async () => {
    arrangeSignedInCheckoutContext();
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 1);

    const { result } = await renderHook(() => useCart());

    await expect(result.current.checkout('cash', [{ method: 'cash', amount_peso: 60 }])).rejects.toThrow(
      'PAYMENT_TOTAL_MISMATCH',
    );
    expect(executeMock).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO sales'), expect.anything());
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('rejects checkout before clearing the cart when inventory is insufficient', async () => {
    arrangeSignedInCheckoutContext();
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 2);
    getOptionalMock.mockResolvedValueOnce(
      createInventoryItem({
        product_id: 'product-1',
        branch_id: 'branch-1',
        stock_quantity: 1,
      }),
    );

    const { result } = await renderHook(() => useCart());

    await expect(result.current.checkout('cash', [{ method: 'cash', amount_peso: 200 }])).rejects.toThrow(
      'INSUFFICIENT_STOCK',
    );
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
