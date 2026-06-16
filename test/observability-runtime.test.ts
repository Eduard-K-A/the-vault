import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('app initializes production observability at startup', () => {
  const app = readFileSync('App.tsx', 'utf8');
  const offlineConfig = readFileSync('src/config/offline.ts', 'utf8');
  const envExample = readFileSync('.env.example', 'utf8');

  assert.match(app, /initializeObservability\(\{/);
  assert.match(offlineConfig, /EXPO_PUBLIC_SENTRY_DSN/);
  assert.match(offlineConfig, /EXPO_PUBLIC_APP_VERSION/);
  assert.match(envExample, /EXPO_PUBLIC_SENTRY_DSN=/);
  assert.match(envExample, /EXPO_PUBLIC_APP_VERSION=/);
});
