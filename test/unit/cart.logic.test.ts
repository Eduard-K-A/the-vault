import { act, renderHook } from '@testing-library/react-native';

import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/store/cartStore';
import { createProduct } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

function inclusiveVat(total: number): number {
  return Math.round((total - total / 1.12) * 100) / 100;
}

describe('cart logic', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it.each([
    [100, 10.71],
    [299.99, 32.14],
    [1500, 160.71],
    [10000, 1071.43],
  ])('computes inclusive VAT for %s', (total, expected) => {
    expect(inclusiveVat(total)).toBe(expected);
  });

  it('computes subtotal and total from cart state', async () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 2);
    useCartStore.getState().addItem(createProduct({ id: 'product-2', selling_price: 50 }), 3);

    const { result } = await renderHook(() => useCart());

    expect(result.current.subtotal).toBe(350);
    expect(result.current.total).toBe(350);
  });

  it('subtracts a fixed discount and floors total at zero', async () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 100 }), 1);
    useCartStore.getState().setDiscountAmount(25);

    const discounted = await renderHook(() => useCart());

    expect(discounted.result.current.total).toBe(75);
    await discounted.unmount();

    await act(async () => {
      useCartStore.getState().setDiscountAmount(999);
    });
    const overDiscounted = await renderHook(() => useCart());

    expect(overDiscounted.result.current.total).toBe(0);
  });

  it('handles zero, fractional, and large totals', () => {
    expect(inclusiveVat(0)).toBe(0);
    expect(inclusiveVat(0.99)).toBe(0.11);
    expect(inclusiveVat(1_000_000)).toBe(107142.86);
  });
});
