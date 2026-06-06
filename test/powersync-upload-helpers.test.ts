import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildFunctionInvokeOptions,
  buildUploadFailureMessage,
  describeFunctionError,
  getFunctionAccessToken,
} from '../src/powersync/uploadHelpers.ts';

test('buildFunctionInvokeOptions sends the current access token as bearer auth', () => {
  const options = buildFunctionInvokeOptions(
    {
      op: 'PUT',
      payload: {
        id: 'product-1',
        table: 'products',
      },
    },
    'access-token-123',
  );

  assert.deepEqual(options, {
    body: {
      op: 'PUT',
      payload: {
        id: 'product-1',
        table: 'products',
      },
    },
    headers: {
      Authorization: 'Bearer access-token-123',
    },
  });
});

test('describeFunctionError includes response status and body without requiring Response instanceof checks', async () => {
  const error = {
    message: 'Edge Function returned a non-2xx status code',
    context: {
      status: 403,
      statusText: 'Forbidden',
      clone() {
        return {
          async text() {
            return '{"error":"forbidden"}';
          },
        };
      },
    },
  };

  assert.equal(
    await describeFunctionError(error),
    'HTTP 403 Forbidden: {"error":"forbidden"}',
  );
});

test('describeFunctionError makes Supabase function 404 responses actionable', async () => {
  const error = {
    message: 'Edge Function returned a non-2xx status code',
    context: {
      status: 404,
      statusText: '',
      clone() {
        return {
          async text() {
            return '{"code":"NOT_FOUND","message":"Requested function was not found"}';
          },
        };
      },
    },
  };

  assert.equal(
    await describeFunctionError(error),
    'HTTP 404 NOT_FOUND: Requested function was not found. Deploy the Edge Function to the configured Supabase project or update the connector function name.',
  );
});

test('buildUploadFailureMessage includes operation context and classified details', () => {
  assert.equal(
    buildUploadFailureMessage({
      table: 'products',
      op: 'PUT',
      id: 'product-1',
      functionName: 'save_product',
      details: 'HTTP 404 NOT_FOUND: Requested function was not found.',
    }),
    '[powersync] upload failed table=products op=PUT id=product-1 function=save_product: HTTP 404 NOT_FOUND: Requested function was not found.',
  );
});

test('getFunctionAccessToken prefers the Supabase client current session token', async () => {
  const token = await getFunctionAccessToken(
    {
      auth: {
        async getSession() {
          return {
            data: {
              session: {
                access_token: 'fresh-token',
              },
            },
          };
        },
      },
    },
    'stored-token',
  );

  assert.equal(token, 'fresh-token');
});

test('getFunctionAccessToken falls back to the stored token when the client has no session', async () => {
  const token = await getFunctionAccessToken(
    {
      auth: {
        async getSession() {
          return {
            data: {
              session: null,
            },
          };
        },
      },
    },
    'stored-token',
  );

  assert.equal(token, 'stored-token');
});
