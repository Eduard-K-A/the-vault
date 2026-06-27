import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Badge, Button, ModalSheet, Screen } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useSyncStore } from '@/store/syncStore';
import { resetAllStores } from '../helpers/resetStores';

async function renderWithSafeArea(children: React.ReactNode) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>,
  );
}

describe('redesign foundation', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('exposes the redesigned token values', () => {
    expect(colors.background).toBe('#FAFAFA');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.accent).toBe('#4F46E5');
    expect(colors.chipActiveBg).toBe('#18181B');
    expect(colors.textPrimary).toBe('#18181B');
    expect(colors.textSecondary).toBe('#71717A');

    expect(typography.title).toEqual(expect.objectContaining({ fontSize: 24, fontWeight: '700' }));
    expect(typography.bodyMedium).toEqual(expect.objectContaining({ fontSize: 15, fontWeight: '500' }));
    expect(typography.priceHero).toEqual(expect.objectContaining({ fontSize: 36, fontWeight: '700' }));

    expect(dimensions.screenPaddingH).toBe(18);
    expect(dimensions.touchTarget).toBe(48);
    expect(dimensions.tabBarHeight).toBe(60);
    expect(dimensions.cardBorderWidth).toBe(0.5);
  });

  it('renders Screen without decorative background blobs', async () => {
    const view = await renderWithSafeArea(
      <Screen title="Inventory" subtitle="Main branch - owner">
        <></>
      </Screen>,
    );

    const output = JSON.stringify(view.toJSON());

    expect(output).toContain('Inventory');
    expect(output).toContain('Main branch - owner');
    expect(output).not.toContain('decorLeft');
    expect(output).not.toContain('rgba(75, 65, 225');
    expect(output).not.toContain('rgba(0, 0, 11');
  });

  it('wraps Screen content in keyboard avoidance', async () => {
    const view = await renderWithSafeArea(
      <Screen title="Inventory" subtitle="Main branch - owner">
        <></>
      </Screen>,
    );

    const keyboardAvoidingView = view.queryByTestId('screen-keyboard-avoiding-view');

    expect(keyboardAvoidingView).toBeTruthy();
  });

  it('wraps modal sheet content in keyboard avoidance', async () => {
    const view = await renderWithSafeArea(
      <ModalSheet visible title="Add discount" onClose={jest.fn()}>
        <></>
      </ModalSheet>,
    );

    const keyboardAvoidingView = view.queryByTestId('modal-sheet-keyboard-avoiding-view');

    expect(keyboardAvoidingView).toBeTruthy();
  });

  it('uses outline danger styling instead of solid danger buttons by default', async () => {
    const view = await render(<Button label="Delete" variant="danger" />);
    const output = JSON.stringify(view.toJSON());

    expect(output).toContain(colors.danger);
    expect(output).not.toContain('"backgroundColor":"#BA1A1A"');
  });

  it('renders badge tones from redesigned status backgrounds', async () => {
    const view = await render(<Badge label="Low stock" tone="warning" />);
    const output = JSON.stringify(view.toJSON());

    expect(output).toContain(colors.warningBg);
    expect(output).toContain(colors.warning);
  });

  it('renders redesigned sync labels', async () => {
    useSyncStore.setState({ phase: 'offline', isOnline: false, pendingUploadCount: 3 });

    await render(<SyncStatusBadge />);

    expect(screen.getByText('Offline - 3 queued')).toBeTruthy();
  });
});
