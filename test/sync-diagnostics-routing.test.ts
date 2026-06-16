import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('sync diagnostics screen is registered in root navigation and reachable from settings', () => {
  const navigationTypes = readFileSync('src/types/navigation.ts', 'utf8');
  const navigator = readFileSync('src/app/RootNavigator.tsx', 'utf8');
  const settings = readFileSync('src/features/settings/SettingsScreen.tsx', 'utf8');
  const ownerSettings = readFileSync('src/features/settings/OwnerSettingsScreen.tsx', 'utf8');

  assert.match(navigationTypes, /SyncDiagnostics: undefined/);
  assert.match(navigator, /SyncDiagnosticsScreen/);
  assert.match(navigator, /<Stack\.Screen name="SyncDiagnostics"/);
  assert.match(settings, /navigation\.navigate\('SyncDiagnostics'\)/);
  assert.match(ownerSettings, /navigation\.navigate\('SyncDiagnostics'\)/);
});
