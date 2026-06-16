import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildLocalSchemaCompatibilityStatements,
  ensureLocalSchemaCompatibility,
} from '../src/powersync/localSchemaCompatibility.ts';

test('buildLocalSchemaCompatibilityStatements includes offline POS lifecycle columns', () => {
  const statements = buildLocalSchemaCompatibilityStatements();
  const sql = statements.map((statement) => statement.sql).join('\n');

  assert.match(sql, /ALTER TABLE sales ADD COLUMN sync_status TEXT/);
  assert.match(sql, /ALTER TABLE sales ADD COLUMN sync_attempt_count INTEGER/);
  assert.match(sql, /ALTER TABLE payments ADD COLUMN status TEXT/);
  assert.match(sql, /ALTER TABLE payments ADD COLUMN provider_reference TEXT/);
  assert.match(sql, /ALTER TABLE inventory_logs ADD COLUMN business_id TEXT/);
  assert.match(sql, /ALTER TABLE inventory_logs ADD COLUMN synced_at TEXT/);
});

test('ensureLocalSchemaCompatibility ignores duplicate-column errors and propagates real failures', async () => {
  const executed: string[] = [];
  await ensureLocalSchemaCompatibility({
    async execute(sql: string) {
      executed.push(sql);
      if (sql.includes('sync_status')) {
        throw new Error('duplicate column name: sync_status');
      }
    },
  });

  assert.equal(executed.length, buildLocalSchemaCompatibilityStatements().length);

  await assert.rejects(
    () =>
      ensureLocalSchemaCompatibility({
        async execute() {
          throw new Error('database is locked');
        },
      }),
    /database is locked/,
  );
});

test('ensureLocalSchemaCompatibility skips PowerSync view-backed tables', async () => {
  const executed: string[] = [];
  await ensureLocalSchemaCompatibility({
    async getOptional(sql: string, params?: unknown[]) {
      executed.push(`${sql} ${JSON.stringify(params ?? [])}`);
      return { type: 'view' };
    },
    async execute(sql: string) {
      throw new Error(`should not alter a view: ${sql}`);
    },
  });

  assert.equal(executed.length, 3);
});
