import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ReportsScreen from '@/features/settings/ReportsScreen';
import { useBusinessStore } from '@/store/businessStore';
import { createBranch, createBusiness } from '../factories/models';
import { resetAllStores } from '../helpers/resetStores';

async function renderReportsScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ReportsScreen />
    </SafeAreaProvider>,
  );
}

describe('ReportsScreen', () => {
  beforeEach(() => {
    resetAllStores();
    const business = createBusiness({ id: 'business-1', name: 'The Vault' });
    const branch = createBranch({ id: 'branch-1', business_id: business.id, name: 'Main Branch' });
    useBusinessStore.setState({
      activeBusiness: business,
      activeBranch: branch,
      availableBusinesses: [],
    });
  });

  it('shows sales and inventory exports plus future CSV/PDF placeholder', async () => {
    const view = await renderReportsScreen();

    expect(view.getByText('Export sales')).toBeTruthy();
    expect(view.getByText('Export inventory')).toBeTruthy();
    expect(view.getByText('CSV & PDF exports')).toBeTruthy();
    expect(view.getByText('Coming soon')).toBeTruthy();
  });
});
