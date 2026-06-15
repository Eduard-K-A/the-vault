import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CheckoutScreen from '@/features/cart/CheckoutScreen';
import type { PaymentMethod } from '@/types/models';
import { navigateMock } from '../__mocks__/navigation';
import { createBranch, createBusiness, createCartItem } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';

const checkoutMock = jest.fn<Promise<string>, [PaymentMethod | undefined, Array<{ method: PaymentMethod; amount_peso: number }> | undefined, string | undefined]>();
const setPaymentMethodMock = jest.fn();

const mockCartState = {
  items: [createCartItem({ product_id: 'product-1', name: 'Coffee', quantity: 2, selling_price: 100, subtotal: 200 })],
  subtotal: 200,
  discountAmount: 25,
  total: 175,
  paymentMethod: 'cash' as PaymentMethod,
  setPaymentMethod: setPaymentMethodMock,
  checkout: checkoutMock,
};

jest.mock('@/hooks/useCart', () => ({
  useCart: () => mockCartState,
}));

async function renderCheckoutScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CheckoutScreen />
    </SafeAreaProvider>,
  );
}

function arrangeCheckoutContext() {
  const business = createBusiness({ id: 'business-1', name: 'Corner Store' });
  const branch = createBranch({ id: 'branch-1', business_id: business.id, name: 'Front Counter' });

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

describe('CheckoutScreen', () => {
  beforeEach(() => {
    resetAllStores();
    arrangeCheckoutContext();
    checkoutMock.mockReset().mockResolvedValue('sale-1');
    setPaymentMethodMock.mockClear();
    mockCartState.items = [
      createCartItem({ product_id: 'product-1', name: 'Coffee', quantity: 2, selling_price: 100, subtotal: 200 }),
    ];
    mockCartState.subtotal = 200;
    mockCartState.discountAmount = 25;
    mockCartState.total = 175;
    mockCartState.paymentMethod = 'cash';
  });

  it('renders cart item summary and totals', async () => {
    const view = await renderCheckoutScreen();
    const output = JSON.stringify(view.toJSON());

    expect(screen.getByText('Corner Store')).toBeTruthy();
    expect(screen.getByText('Front Counter')).toBeTruthy();
    expect(screen.getByText('Coffee')).toBeTruthy();
    expect(output).toContain('2');
    expect(output).toContain('\u20b1100.00');
    expect(output).toContain('\u20b1175.00');
    expect(output).toContain('\u20b125.00');
  });

  it('adds and removes a split payment row', async () => {
    await renderCheckoutScreen();

    await fireEvent.press(screen.getByLabelText('Add payment line'));
    expect(screen.getByText('Payment 2')).toBeTruthy();
    expect(screen.getByLabelText('Payment 2 amount')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Remove payment 2'));
    expect(screen.queryByText('Payment 2')).toBeNull();
  });

  it('uses the selected payment method when completing the sale', async () => {
    await renderCheckoutScreen();

    await fireEvent.press(screen.getByLabelText('Select gcash payment for payment 1'));
    await fireEvent.press(screen.getByLabelText('Complete sale'));

    await waitFor(() => {
      expect(checkoutMock).toHaveBeenCalledWith(
        'gcash',
        [{ method: 'gcash', amount_peso: 175 }],
        expect.stringMatching(/^button-/),
      );
    });
  });

  it('shows a payment incomplete alert when received total is below the cart total', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    return renderCheckoutScreen().then(async () => {
      await fireEvent.changeText(screen.getByLabelText('Payment 1 amount'), '100');
      await fireEvent.press(screen.getByLabelText('Complete sale'));

      expect(alertSpy).toHaveBeenCalledWith('Payment incomplete', 'The split payment rows must cover the full total.');
      expect(checkoutMock).not.toHaveBeenCalled();
    });
  });

  it('completes checkout and navigates to the receipt', async () => {
    await renderCheckoutScreen();

    await fireEvent.press(screen.getByLabelText('Complete sale'));

    await waitFor(() => {
      expect(checkoutMock).toHaveBeenCalledWith(
        'cash',
        [{ method: 'cash', amount_peso: 175 }],
        expect.stringMatching(/^button-/),
      );
      expect(navigateMock).toHaveBeenCalledWith('Receipt', { saleId: 'sale-1' });
    });
  });

  it('renders the current offline checkout footer copy', async () => {
    await renderCheckoutScreen();

    expect(screen.getByText('Saving offline. Will sync when connected.')).toBeTruthy();
  });
});
