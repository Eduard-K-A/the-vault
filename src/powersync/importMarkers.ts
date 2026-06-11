export const SYNC_IMPORT_MARKERS_TABLE = 'sync_import_markers';

export const CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${SYNC_IMPORT_MARKERS_TABLE} (
    table_name TEXT NOT NULL,
    row_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (table_name, row_id)
  )
`;

export function syncImportMarkerKey(table: string, id: string): [string, string] {
  return [table, id];
}

interface SyncImportMarkerStore {
  execute: (sql: string, params: unknown[]) => Promise<unknown>;
  getAll: <T>(sql: string, params: unknown[]) => Promise<T[]>;
}

export async function markExistingRowsAsSyncImports(
  store: SyncImportMarkerStore,
  table: string,
): Promise<void> {
  const rows = await store.getAll<{ id?: unknown }>(`SELECT id FROM ${table}`, []);
  for (const row of rows) {
    if (typeof row.id !== 'string') {
      continue;
    }

    await store.execute(`INSERT OR REPLACE INTO ${SYNC_IMPORT_MARKERS_TABLE} (table_name, row_id) VALUES (?, ?)`, [
      ...syncImportMarkerKey(table, row.id),
    ]);
  }
}
