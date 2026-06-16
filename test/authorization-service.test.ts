import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertRoleCanPerform, canRolePerform } from '../src/services/authorization.service.ts';

test('owner can perform protected POS operations', () => {
  assert.equal(canRolePerform('owner', 'sale.checkout'), true);
  assert.equal(canRolePerform('owner', 'sale.refund'), true);
  assert.equal(canRolePerform('owner', 'sale.void'), true);
  assert.equal(canRolePerform('owner', 'inventory.adjust'), true);
  assert.equal(canRolePerform('owner', 'employee.manage'), true);
});

test('employee can checkout and restock but cannot perform owner-only operations', () => {
  assert.equal(canRolePerform('employee', 'sale.checkout'), true);
  assert.equal(canRolePerform('employee', 'inventory.restock'), true);
  assert.equal(canRolePerform('employee', 'sale.refund'), false);
  assert.equal(canRolePerform('employee', 'sale.void'), false);
  assert.equal(canRolePerform('employee', 'inventory.adjust'), false);
  assert.equal(canRolePerform('employee', 'employee.manage'), false);
});

test('assertRoleCanPerform throws stable permission errors', () => {
  assert.throws(() => assertRoleCanPerform('employee', 'sale.refund'), /PERMISSION_DENIED:sale\.refund/);
  assert.doesNotThrow(() => assertRoleCanPerform('owner', 'sale.refund'));
});
