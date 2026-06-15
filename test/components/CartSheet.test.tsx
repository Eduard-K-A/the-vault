import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CartSheet from '@/features/cart/CartSheet';
import { useCartStore } from '@/store/cartStore';
import { navigateMock } from '../__mocks__/navigation';
import { createProduct } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

async function renderCartSheet(onClose = jest.fn()) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CartSheet visible onClose={onClose} />
    </SafeAreaProvider>,
  );
}

describe('CartSheet', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('renders an empty state when there are no items', async () => {
    await renderCartSheet();

    expect(screen.getByText('Your cart is empty.')).toBeTruthy();
    expect(screen.getByText('Tap a product to start a sale, or scan a barcode to add items faster.')).toBeTruthy();
  });

  it('renders item quantity and subtotal', async () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', name: 'Coffee', selling_price: 75 }), 2);

    const view = await renderCartSheet();
    const output = JSON.stringify(view.toJSON());

    expect(screen.getByText('Coffee')).toBeTruthy();
    expect(output).toContain('2');
    expect(output).toContain('\u20b175.00');
    expect(output).toContain('\u20b1150.00');
  });

  it('increases and decreases item quantity', async () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', name: 'Coffee', selling_price: 75 }), 2);

    await renderCartSheet();

    await fireEvent.press(screen.getByLabelText('Increase Coffee quantity'));
    expect(useCartStore.getState().items[0]).toEqual(
      expect.objectContaining({
        quantity: 3,
        subtotal: 225,
      }),
    );

    await fireEvent.press(screen.getByLabelText('Decrease Coffee quantity'));
    expect(useCartStore.getState().items[0]).toEqual(
      expect.objectContaining({
        quantity: 2,
        subtotal: 150,
      }),
    );
  });

  it('removes an item', async () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', name: 'Coffee' }));

    await renderCartSheet();

    await fireEvent.press(screen.getByLabelText('Remove Coffee'));

    expect(useCartStore.getState().items).toEqual([]);
  });

  it('applies a fixed discount through the discount modal', async () => {
    useCartStore.getState().addItem(createProduct({ id: 'product-1', name: 'Coffee', selling_price: 100 }), 2);

    await renderCartSheet();

    await fireEvent.press(screen.getByLabelText('Add discount'));
    await fireEvent.press(screen.getByLabelText('Set discount mode to amount'));
    await fireEvent.changeText(screen.getByLabelText('Discount amount'), '25');
    await fireEvent.press(screen.getByLabelText('Apply discount'));

    expect(useCartStore.getState().discountAmount).toBe(25);
    expect(screen.getAllByText('\u20b1175.00').length).toBeGreaterThan(0);
  });

  it('navigates to checkout from the checkout button', async () => {
    const onClose = jest.fn();
    useCartStore.getState().addItem(createProduct({ id: 'product-1', name: 'Coffee' }));

    await renderCartSheet(onClose);

    await fireEvent.press(screen.getByLabelText('Checkout cart'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('Checkout');
  });
});
