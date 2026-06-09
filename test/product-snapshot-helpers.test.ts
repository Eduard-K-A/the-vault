import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildBusinessOwnerLookup, resolveProductAuditUserIds } from '../src/db/productSnapshotHelpers.ts';

test('resolveProductAuditUserIds uses product audit fields when present', () => {
  const owners = buildBusinessOwnerLookup([
    {
      id: 'business-1',
      owner_id: 'owner-1',
    },
  ]);

  const audit = resolveProductAuditUserIds(
    {
      id: 'product-1',
      business_id: 'business-1',
      created_by: 'creator-1',
      last_modified_by: 'editor-1',
    },
    owners,
  );

  assert.deepEqual(audit, {
    createdBy: 'creator-1',
    lastModifiedBy: 'editor-1',
  });
});

test('resolveProductAuditUserIds falls back to the business owner for legacy product rows', () => {
  const owners = buildBusinessOwnerLookup([
    {
      id: 'business-1',
      owner_id: 'owner-1',
    },
  ]);

  const audit = resolveProductAuditUserIds(
    {
      id: 'product-1',
      business_id: 'business-1',
      created_by: null,
      last_modified_by: null,
    },
    owners,
  );

  assert.deepEqual(audit, {
    createdBy: 'owner-1',
    lastModifiedBy: 'owner-1',
  });
});

test('resolveProductAuditUserIds rejects product rows with no usable audit user', () => {
  assert.throws(
    () =>
      resolveProductAuditUserIds(
        {
          id: 'product-1',
          business_id: 'business-1',
          created_by: null,
          last_modified_by: null,
        },
        new Map(),
      ),
    /Product product-1 is missing created_by\/last_modified_by/,
  );
});
