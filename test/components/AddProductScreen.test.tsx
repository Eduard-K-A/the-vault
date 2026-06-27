import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AddProductScreen from '@/features/inventory/AddProductScreen';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { createBranch, createBusiness } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

async function renderAddProductScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <AddProductScreen />
    </SafeAreaProvider>,
  );
}

describe('AddProductScreen', () => {
  beforeEach(() => {
    resetAllStores();
    const business = createBusiness({ id: 'business-1', name: 'The Vault' });
    const branch = createBranch({ id: 'branch-1', business_id: business.id, name: 'Main Branch' });
    useAuthStore.setState({
      status: 'signed_in',
      userId: 'owner-1',
      email: 'owner@example.com',
      fullname: 'Owner One',
      role: 'owner',
      accessToken: 'access-token',
      error: null,
    });
    useBusinessStore.setState({
      activeBusiness: business,
      activeBranch: branch,
      availableBusinesses: [],
    });
  });

  it('shows photo picker, category metadata, and scanner placeholders', async () => {
    const view = await renderAddProductScreen();

    expect(view.getByText('Product photo')).toBeTruthy();
    expect(view.getByText('Choose photo')).toBeTruthy();
    expect(view.getByText('Take photo')).toBeTruthy();
    expect(view.getByText('Category metadata is coming soon. Use description for now.')).toBeTruthy();
    expect(view.getByLabelText('Scan barcode')).toBeTruthy();
  });
});
