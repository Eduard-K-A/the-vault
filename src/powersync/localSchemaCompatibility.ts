interface LocalSchemaDatabase {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
  getOptional?: <T>(sql: string, params?: unknown[]) => Promise<T | null | undefined>;
}

interface LocalSchemaStatement {
  table: string;
  column: string;
  sql: string;
}

const COMPATIBILITY_COLUMNS: Array<{ table: string; column: string; type: string }> = [
  { table: 'sales', column: 'sync_status', type: "TEXT DEFAULT 'sync_pending'" },
  { table: 'sales', column: 'sync_attempt_count', type: 'INTEGER DEFAULT 0' },
  { table: 'sales', column: 'last_sync_error_code', type: 'TEXT' },
  { table: 'sales', column: 'last_sync_error_message', type: 'TEXT' },
  { table: 'sales', column: 'last_sync_error_at', type: 'TEXT' },
  { table: 'sales', column: 'last_sync_attempt_at', type: 'TEXT' },
  { table: 'sales', column: 'server_confirmed_at', type: 'TEXT' },
  { table: 'payments', column: 'branch_id', type: 'TEXT' },
  { table: 'payments', column: 'status', type: "TEXT DEFAULT 'paid'" },
  { table: 'payments', column: 'provider', type: 'TEXT' },
  { table: 'payments', column: 'provider_reference', type: 'TEXT' },
  { table: 'payments', column: 'offline_approved', type: 'INTEGER DEFAULT 0' },
  { table: 'payments', column: 'created_at', type: 'TEXT' },
  { table: 'payments', column: 'synced_at', type: 'TEXT' },
  { table: 'inventory_logs', column: 'business_id', type: 'TEXT' },
  { table: 'inventory_logs', column: 'reason', type: 'TEXT' },
  { table: 'inventory_logs', column: 'synced_at', type: 'TEXT' },
];

function isDuplicateColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('duplicate column');
}

async function isViewBackedObject(database: LocalSchemaDatabase, table: string): Promise<boolean> {
  if (!database.getOptional) {
    return false;
  }

  const row = await database.getOptional<{ type?: string }>(
    "SELECT type FROM sqlite_schema WHERE name = ? AND type IN ('table', 'view') LIMIT 1",
    [table],
  );

  return row?.type === 'view';
}

export function buildLocalSchemaCompatibilityStatements(): LocalSchemaStatement[] {
  return COMPATIBILITY_COLUMNS.map(({ table, column, type }) => ({
    table,
    column,
    sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`,
  }));
}

export async function ensureLocalSchemaCompatibility(database: LocalSchemaDatabase): Promise<void> {
  const viewBackedTables = new Set<string>();

  for (const table of new Set(COMPATIBILITY_COLUMNS.map((entry) => entry.table))) {
    if (await isViewBackedObject(database, table)) {
      viewBackedTables.add(table);
    }
  }

  for (const statement of buildLocalSchemaCompatibilityStatements()) {
    if (viewBackedTables.has(statement.table)) {
      continue;
    }

    try {
      await database.execute(statement.sql, []);
    } catch (error) {
      if (!isDuplicateColumnError(error)) {
        throw error;
      }
    }
  }
}
