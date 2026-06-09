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
