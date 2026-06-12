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

test('commit_sale reads existing sale lookup as an array result', () => {
  const source = readFileSync('supabase/functions/commit_sale/index.ts', 'utf8');
  const existingSaleLookup = source.slice(source.indexOf('const { data: existingSale'), source.indexOf('if (existingSaleError)'));

  assert.match(existingSaleLookup, /\.limit\(1\);/);
  assert.doesNotMatch(existingSaleLookup, /maybeSingle\(\)/);
  assert.match(source, /const existingSale = existingSaleRows\?\.\[0\] \?\? null;/);
});

test('commit_sale performs membership lookup inline with stage diagnostics', () => {
  const source = readFileSync('supabase/functions/commit_sale/index.ts', 'utf8');
  const membershipLookup = source.slice(source.indexOf("logCommitSale('membership lookup started'"), source.indexOf("logCommitSale('membership accepted'"));

  assert.match(membershipLookup, /from\('business_members'\)/);
  assert.match(membershipLookup, /\.limit\(1\);/);
  assert.doesNotMatch(membershipLookup, /maybeSingle\(\)/);
  assert.match(membershipLookup, /stageError\('membership_lookup'/);
  assert.match(membershipLookup, /version: COMMIT_SALE_VERSION/);
});

test('commit_sale exposes debug version and failure stage in errors', () => {
  const source = readFileSync('supabase/functions/commit_sale/index.ts', 'utf8');

  assert.match(source, /COMMIT_SALE_VERSION/);
  assert.match(source, /function stageError/);
  assert.match(source, /stage, version: COMMIT_SALE_VERSION/);
  assert.match(source, /logCommitSale\('payload parsed'/);
});
