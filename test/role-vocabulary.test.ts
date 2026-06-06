import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const ROOT = process.cwd();
const SEARCH_ROOTS = ['src', 'supabase/functions', 'supabase/migrations', 'test'];
const SKIP_DIRECTORIES = new Set(['.temp']);

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return SKIP_DIRECTORIES.has(entry) ? [] : listFiles(path);
    }

    return [path];
  });
}

test('role vocabulary only contains employee and owner roles', () => {
  const files = SEARCH_ROOTS.flatMap((root) => listFiles(join(ROOT, root)));
  const filesWithManagerRole = files
    .filter((file) => !file.endsWith('role-vocabulary.test.ts'))
    .filter((file) => /\bmanager\b/i.test(readFileSync(file, 'utf8')))
    .map((file) => relative(ROOT, file));

  assert.deepEqual(filesWithManagerRole, []);
});
