import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  configureObservability,
  captureException,
  sanitizeObservabilityContext,
} from '../src/services/observability.service.ts';

test('sanitizeObservabilityContext redacts token and password fields recursively', () => {
  assert.deepEqual(
    sanitizeObservabilityContext({
      accessToken: 'secret',
      nested: {
        refreshToken: 'refresh-secret',
        keep: 'visible',
      },
      list: [{ password: 'hidden' }],
    }),
    {
      accessToken: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        keep: 'visible',
      },
      list: [{ password: '[REDACTED]' }],
    },
  );
});

test('captureException sends sanitized context to configured sink', () => {
  let captured: { error: Error; context: Record<string, unknown> } | null = null;
  configureObservability({
    captureException(error, context) {
      captured = { error, context };
    },
  });

  captureException('sync failed', {
    saleId: 'sale-1',
    authorization: 'Bearer secret',
  });

  assert.equal(captured?.error.message, 'sync failed');
  assert.deepEqual(captured?.context, {
    saleId: 'sale-1',
    authorization: '[REDACTED]',
  });

  configureObservability(null);
});
