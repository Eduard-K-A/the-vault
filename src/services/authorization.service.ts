import type { UserRole } from '@/types/models';

export type PosPermission =
  | 'sale.checkout'
  | 'sale.refund'
  | 'sale.void'
  | 'inventory.restock'
  | 'inventory.adjust'
  | 'employee.manage'
  | 'business.settings';

const OWNER_PERMISSIONS: ReadonlySet<PosPermission> = new Set([
  'sale.checkout',
  'sale.refund',
  'sale.void',
  'inventory.restock',
  'inventory.adjust',
  'employee.manage',
  'business.settings',
]);

const EMPLOYEE_PERMISSIONS: ReadonlySet<PosPermission> = new Set([
  'sale.checkout',
  'inventory.restock',
]);

export function canRolePerform(role: UserRole | null | undefined, permission: PosPermission): boolean {
  if (role === 'owner') {
    return OWNER_PERMISSIONS.has(permission);
  }

  if (role === 'employee') {
    return EMPLOYEE_PERMISSIONS.has(permission);
  }

  return false;
}

export function assertRoleCanPerform(role: UserRole | null | undefined, permission: PosPermission): void {
  if (!canRolePerform(role, permission)) {
    throw new Error(`PERMISSION_DENIED:${permission}`);
  }
}
