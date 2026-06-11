import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('commit_sale upserts payments by payment id', () => {
  const source = readFileSync('supabase/functions/commit_sale/index.ts', 'utf8');
  const paymentLoop = source.slice(source.indexOf('for (const payment'), source.indexOf('for (const inventory'));

  assert.match(paymentLoop, /from\('payments'\)\.upsert/);
  assert.match(paymentLoop, /onConflict: 'id'/);
  assert.doesNotMatch(paymentLoop, /onConflict: 'product_id,branch_id'/);
});
