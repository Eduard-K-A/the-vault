import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canConfirmBranchDeletion } from '../src/features/settings/branchDeletionHelpers.ts';

const branch = {
  id: 'branch-1',
  business_id: 'business-1',
  name: 'Main Branch',
  is_active: true,
};

test('canConfirmBranchDeletion only allows exact branch name confirmation', () => {
  assert.equal(canConfirmBranchDeletion(branch, ''), false);
  assert.equal(canConfirmBranchDeletion(branch, 'main branch'), false);
  assert.equal(canConfirmBranchDeletion(branch, 'Main Branch '), false);
  assert.equal(canConfirmBranchDeletion(branch, 'Main Branch'), true);
});

test('canConfirmBranchDeletion rejects confirmation when no branch is selected', () => {
  assert.equal(canConfirmBranchDeletion(null, 'Main Branch'), false);
});
