import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL,
  SYNC_IMPORT_MARKERS_TABLE,
  markExistingRowsAsSyncImports,
  syncImportMarkerKey,
} from '../src/powersync/importMarkers.ts';

test('sync import markers use a local table outside the synced schema', () => {
  assert.equal(SYNC_IMPORT_MARKERS_TABLE, 'sync_import_markers');
  assert.match(CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL, /CREATE TABLE IF NOT EXISTS sync_import_markers/i);
  assert.deepEqual(syncImportMarkerKey('products', 'product-1'), ['products', 'product-1']);
});

test('markExistingRowsAsSyncImports marks rows before snapshot replacement deletes them locally', async () => {
  const executed: Array<{ sql: string; params: unknown[] }> = [];

  await markExistingRowsAsSyncImports(
    {
      async getAll(sql) {
        assert.equal(sql, 'SELECT id FROM businesses');
        return [{ id: 'business-1' }, { id: 'business-2' }, { id: null }];
      },
      async execute(sql, params) {
        executed.push({ sql, params });
      },
    },
    'businesses',
  );

  assert.deepEqual(executed, [
    {
      sql: 'INSERT OR REPLACE INTO sync_import_markers (table_name, row_id) VALUES (?, ?)',
      params: ['businesses', 'business-1'],
    },
    {
      sql: 'INSERT OR REPLACE INTO sync_import_markers (table_name, row_id) VALUES (?, ?)',
      params: ['businesses', 'business-2'],
    },
  ]);
});
