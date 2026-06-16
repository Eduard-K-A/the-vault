import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('offline checkout maestro flow uses concrete selectors and network transitions', () => {
  const flow = readFileSync('.maestro/offline-checkout.yaml', 'utf8');
  const syncBadge = readFileSync('src/components/SyncStatusBadge.tsx', 'utf8');
  const inventoryScreen = readFileSync('src/features/inventory/InventoryScreen.tsx', 'utf8');

  assert.match(syncBadge, /testID="sync-status"/);
  assert.match(inventoryScreen, /accessibilityLabel=\{role === 'owner' \? 'Add product' : 'Open cart'\}/);
  assert.match(flow, /appId: \$\{APP_ID\}/);
  assert.match(flow, /- tapOn:\s*\n\s+id: "sync-status"/);
  assert.match(flow, /- setAirplaneMode: true/);
  assert.match(flow, /- tapOn: "Open cart"/);
  assert.match(flow, /- tapOn: "Checkout cart"/);
  assert.match(flow, /- tapOn: "Complete sale"/);
  assert.match(flow, /- assertVisible: "Sale Complete!"/);
  assert.match(flow, /- setAirplaneMode: false/);
  assert.doesNotMatch(flow, /optional: true/);
});
