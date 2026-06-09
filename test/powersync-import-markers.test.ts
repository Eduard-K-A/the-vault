import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL,
  SYNC_IMPORT_MARKERS_TABLE,
  syncImportMarkerKey,
} from '../src/powersync/importMarkers.ts';

test('sync import markers use a local table outside the synced schema', () => {
  assert.equal(SYNC_IMPORT_MARKERS_TABLE, 'sync_import_markers');
  assert.match(CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL, /CREATE TABLE IF NOT EXISTS sync_import_markers/i);
  assert.deepEqual(syncImportMarkerKey('products', 'product-1'), ['products', 'product-1']);
});
