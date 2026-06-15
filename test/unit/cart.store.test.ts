import { useCartStore } from '@/store/cartStore';
import { createProduct } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

describe('cartStore', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('adds a new product to an empty cart', () => {
    const product = createProduct({ id: 'product-1', selling_price: 125 });

    useCartStore.getState().addItem(product);

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({
        product_id: 'product-1',
        quantity: 1,
        subtotal: 125,
      }),
    ]);
  });

  it('increments quantity when the same product is added again', () => {
    const product = createProduct({ id: 'product-1', selling_price: 50 });

    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem(product, 2);

    expect(useCartStore.getState().items[0]).toEqual(
      expect.objectContaining({
        quantity: 3,
        subtotal: 150,
      }),
    );
  });

  it('removes only the selected item', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', name: 'First' }));
    useCartStore.getState().addItem(createProduct({ id: 'product-2', name: 'Second' }));

    useCartStore.getState().removeItem('product-1');

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].product_id).toBe('product-2');
  });

  it('updates quantity and subtotal', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', selling_price: 25 }));

    useCartStore.getState().setQuantity('product-1', 4);

    expect(useCartStore.getState().items[0]).toEqual(
      expect.objectContaining({
        quantity: 4,
        subtotal: 100,
      }),
    );
  });

  it('removes an item when quantity is zero or negative', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1' }));
    useCartStore.getState().setQuantity('product-1', 0);
    expect(useCartStore.getState().items).toEqual([]);

    useCartStore.getState().addItem(createProduct({ id: 'product-2' }));
    useCartStore.getState().setQuantity('product-2', -1);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('clears cart state to initial values', () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1' }));
    useCartStore.getState().setPaymentMethod('maya');
    useCartStore.getState().setDiscountAmount(10);
    useCartStore.getState().setNote('Gift wrap');

    useCartStore.getState().clearCart();

    expect(useCartStore.getState()).toEqual(
      expect.objectContaining({
        items: [],
        paymentMethod: 'cash',
        discountAmount: 0,
        note: '',
      }),
    );
  });

  it('stores payment method, discount, and note', () => {
    useCartStore.getState().setPaymentMethod('gcash');
    useCartStore.getState().setDiscountAmount(-5);
    useCartStore.getState().setNote('Customer note');

    expect(useCartStore.getState().paymentMethod).toBe('gcash');
    expect(useCartStore.getState().discountAmount).toBe(0);
    expect(useCartStore.getState().note).toBe('Customer note');
  });
});
