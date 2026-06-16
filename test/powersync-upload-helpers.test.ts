import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  buildCrudUploadPayload,
  buildFunctionInvokeOptions,
  buildUnsupportedUploadMessage,
  buildUploadFailureMessage,
  classifyFunctionError,
  describeFunctionError,
  getUploadRetryDelayMs,
  getUploadFunctionName,
  getFunctionAccessToken,
  isLikelySnapshotImportTransaction,
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

test('classifyFunctionError pauses upload when auth expires', async () => {
  const classification = await classifyFunctionError({
    context: {
      status: 401,
      statusText: 'Unauthorized',
      clone() {
        return {
          async text() {
            return '{"message":"JWT expired"}';
          },
        };
      },
    },
  });

  assert.deepEqual(classification, {
    code: 'auth_expired',
    retryable: false,
    requiresAuth: true,
    requiresReview: false,
    status: 401,
    message: 'HTTP 401 Unauthorized: JWT expired',
  });
});

test('classifyFunctionError marks validation failures as requiring review', async () => {
  const classification = await classifyFunctionError({
    context: {
      status: 422,
      statusText: 'Unprocessable Entity',
      clone() {
        return {
          async text() {
            return '{"code":"VALIDATION_FAILED","message":"payment total does not match sale total"}';
          },
        };
      },
    },
  });

  assert.equal(classification.code, 'validation_failed');
  assert.equal(classification.retryable, false);
  assert.equal(classification.requiresReview, true);
  assert.equal(classification.status, 422);
});

test('classifyFunctionError retries transient network and server errors', async () => {
  const networkClassification = await classifyFunctionError(new Error('Failed to fetch'));
  assert.equal(networkClassification.code, 'network_unavailable');
  assert.equal(networkClassification.retryable, true);

  const serverClassification = await classifyFunctionError({
    context: {
      status: 503,
      statusText: 'Service Unavailable',
      clone() {
        return {
          async text() {
            return 'temporarily unavailable';
          },
        };
      },
    },
  });

  assert.equal(serverClassification.code, 'server_error');
  assert.equal(serverClassification.retryable, true);
});

test('getUploadRetryDelayMs applies bounded exponential backoff with jitter', () => {
  assert.equal(getUploadRetryDelayMs(1, { random: () => 0, jitterRatio: 0 }), 1000);
  assert.equal(getUploadRetryDelayMs(4, { random: () => 0, jitterRatio: 0 }), 8000);
  assert.equal(getUploadRetryDelayMs(10, { random: () => 1, maxDelayMs: 30000 }), 30000);
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

test('buildUnsupportedUploadMessage makes unmapped local writes block sync completion', () => {
  assert.equal(
    buildUnsupportedUploadMessage({
      table: 'sale_items',
      op: 'PUT',
      id: 'sale-item-1',
    }),
    '[powersync] unsupported local write table=sale_items op=PUT id=sale-item-1. Add an upload route before marking this sync complete.',
  );
});

test('buildCrudUploadPayload merges the latest local row for product updates', () => {
  assert.deepEqual(
    buildCrudUploadPayload(
      {
        table: 'products',
        id: 'product-1',
        opData: {
          name: 'Updated name',
        },
      },
      {
        id: 'product-1',
        business_id: 'business-1',
        name: 'Updated name',
        selling_price: 25,
        cost_price: 10,
      },
    ),
    {
      id: 'product-1',
      table: 'products',
      business_id: 'business-1',
      name: 'Updated name',
      selling_price: 25,
      cost_price: 10,
    },
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

test('getUploadFunctionName routes business deletes to delete-business', () => {
  assert.equal(getUploadFunctionName('businesses', 'DELETE', 'DELETE'), 'delete-business');
});

test('getUploadFunctionName routes POS domain tables to bundle functions', () => {
  assert.equal(getUploadFunctionName('sales', 'PUT', 'DELETE'), 'commit_sale');
  assert.equal(getUploadFunctionName('refunds', 'PUT', 'DELETE'), 'create_refund');
  assert.equal(getUploadFunctionName('inventory_logs', 'PUT', 'DELETE'), 'apply_inventory_adjustment');
  assert.equal(getUploadFunctionName('audit_logs', 'PUT', 'DELETE'), 'write_audit_log');
});

test('getUploadFunctionName does not route unsupported deletes', () => {
  assert.equal(getUploadFunctionName('branches', 'DELETE', 'DELETE'), null);
  assert.equal(getUploadFunctionName('products', 'DELETE', 'DELETE'), null);
});

test('isLikelySnapshotImportTransaction detects stale bootstrap replace batches', () => {
  assert.equal(
    isLikelySnapshotImportTransaction(
      [
        { table: 'profiles', op: 'DELETE', id: 'user-1' },
        { table: 'businesses', op: 'DELETE', id: 'business-1' },
        { table: 'businesses', op: 'PUT', id: 'business-1' },
        { table: 'branches', op: 'DELETE', id: 'branch-1' },
        { table: 'branches', op: 'PUT', id: 'branch-1' },
        { table: 'business_members', op: 'DELETE', id: 'member-1' },
        { table: 'business_members', op: 'PUT', id: 'member-1' },
        { table: 'products', op: 'DELETE', id: 'product-1' },
        { table: 'products', op: 'PUT', id: 'product-1' },
        { table: 'inventory_items', op: 'DELETE', id: 'inventory-1' },
        { table: 'inventory_items', op: 'PUT', id: 'inventory-1' },
      ],
      'DELETE',
    ),
    true,
  );
});

test('isLikelySnapshotImportTransaction does not hide ordinary local mutations', () => {
  assert.equal(
    isLikelySnapshotImportTransaction(
      [
        { table: 'products', op: 'DELETE', id: 'product-1' },
        { table: 'products', op: 'PUT', id: 'product-1' },
      ],
      'DELETE',
    ),
    false,
  );
  assert.equal(
    isLikelySnapshotImportTransaction(
      [{ table: 'business_members', op: 'PUT', id: 'member-1' }],
      'DELETE',
    ),
    false,
  );
});

test('PowerSync sale uploads include fallback inventory rows referenced by inventory logs', () => {
  const source = readFileSync('src/powersync/connector.ts', 'utf8');

  assert.match(source, /fallback_inventory_items/);
  assert.match(source, /for \(const log of inventoryLogs\)/);
  assert.match(source, /getInventoryItemForLog\(database, log\)/);
  assert.match(source, /inventoryItems\.push\(inventoryItem\)/);
});
