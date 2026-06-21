import { fireEvent, render } from '@testing-library/react-native';

import { SearchBar } from '@/components/SearchBar';

describe('SearchBar', () => {
  it('routes scanner taps to a future-scope placeholder handler', async () => {
    const onScanUnavailable = jest.fn();
    const view = await render(
      <SearchBar value="" onChangeText={jest.fn()} onScanUnavailable={onScanUnavailable} />,
    );

    fireEvent.press(view.getByLabelText('Scan barcode'));

    expect(onScanUnavailable).toHaveBeenCalledWith('Scanner is coming soon. Enter SKU or barcode manually.');
  });
});
