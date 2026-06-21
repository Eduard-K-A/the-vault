import { fireEvent, render } from '@testing-library/react-native';

import {
  AppHeader,
  IconButton,
  PlaceholderAction,
  SegmentedControl,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';

describe('premium UI foundation', () => {
  it('uses the premium POS token defaults', () => {
    expect(colors.background).toBe('#F7F7F7');
    expect(colors.accent).toBe('#2563EB');
    expect(dimensions.touchTarget).toBe(48);
  });

  it('renders a left-aligned operational app header with sync and action slots', async () => {
    const view = await render(
      <AppHeader
        title="Main Branch"
        subtitle="The Vault · Owner"
        sync={<PlaceholderAction label="Synced" message="Already synced." />}
        action={<IconButton label="Filter products" icon="⌕" onPress={jest.fn()} />}
      />,
    );

    expect(view.getByText('Main Branch')).toBeTruthy();
    expect(view.getByText('The Vault · Owner')).toBeTruthy();
    expect(view.getByLabelText('Filter products')).toBeTruthy();
    expect(view.getByLabelText('Synced')).toBeTruthy();
  });

  it('renders icon buttons with accessible labels and 48dp hit targets', async () => {
    const onPress = jest.fn();
    const view = await render(<IconButton label="Open scanner" icon="⌗" onPress={onPress} />);

    fireEvent.press(view.getByLabelText('Open scanner'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(view.toJSON())).toContain('"width":48');
    expect(JSON.stringify(view.toJSON())).toContain('"height":48');
  });

  it('renders a segmented control without resizing selected segments', async () => {
    const onChange = jest.fn();
    const view = await render(
      <SegmentedControl
        accessibilityLabel="Sales period"
        value="Today"
        options={[
          { label: 'Today', value: 'Today' },
          { label: '7 Days', value: '7 Days' },
          { label: '30 Days', value: '30 Days' },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.press(view.getByText('7 Days'));

    expect(onChange).toHaveBeenCalledWith('7 Days');
    expect(JSON.stringify(view.toJSON())).toContain('"flex":1');
  });

  it('keeps future-scope placeholder actions visible but non-mutating', async () => {
    const onUnavailable = jest.fn();

    const view = await render(
      <PlaceholderAction
        label="Export PDF"
        message="CSV/PDF export is coming soon. Excel export is available now."
        onUnavailable={onUnavailable}
      />,
    );

    fireEvent.press(view.getByLabelText('Export PDF'));

    expect(onUnavailable).toHaveBeenCalledWith('CSV/PDF export is coming soon. Excel export is available now.');
    expect(view.getByText('Export PDF')).toBeTruthy();
  });
});
