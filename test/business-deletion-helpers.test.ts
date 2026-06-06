import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canConfirmBusinessDeletion } from '../src/features/settings/businessDeletionHelpers.ts';

const business = {
  id: 'business-1',
  name: 'Vault Coffee',
  owner_id: 'owner-1',
  join_code: 'ABC123',
  logo_url: null,
  address: null,
  is_active: true,
  created_at: '2026-06-06T00:00:00.000Z',
};

test('canConfirmBusinessDeletion only allows exact business name confirmation', () => {
  assert.equal(canConfirmBusinessDeletion(business, ''), false);
  assert.equal(canConfirmBusinessDeletion(business, 'vault coffee'), false);
  assert.equal(canConfirmBusinessDeletion(business, 'Vault Coffee '), false);
  assert.equal(canConfirmBusinessDeletion(business, 'Vault Coffee'), true);
});

test('canConfirmBusinessDeletion rejects confirmation when no business is selected', () => {
  assert.equal(canConfirmBusinessDeletion(null, 'Vault Coffee'), false);
});
