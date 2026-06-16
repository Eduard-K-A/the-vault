import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { configureObservability } from '@/services/observability.service';

describe('AppErrorBoundary', () => {
  it('captures render failures without clearing app state', async () => {
    const captureException = jest.fn();
    configureObservability({ captureException });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    function BrokenChild(): React.ReactElement {
      throw new Error('Render failed');
    }

    await render(
      <AppErrorBoundary>
        <BrokenChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Your local sales data was not cleared.')).toBeTruthy();
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      boundary: 'AppErrorBoundary',
    }));

    configureObservability(null);
    jest.restoreAllMocks();
  });

  it('renders children when no error is thrown', async () => {
    await render(
      <AppErrorBoundary>
        <Text>Healthy app</Text>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Healthy app')).toBeTruthy();
  });
});
