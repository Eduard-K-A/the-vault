import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('redesign removes operational content anti-pattern copy', () => {
  const employeeSales = read('src/features/sales/SalesScreen.tsx');
  const analytics = read('src/features/sales/AnalyticsScreen.tsx');
  const salesOverview = read('src/features/sales/SalesOverviewScreen.tsx');
  const ownerSettings = read('src/features/settings/OwnerSettingsScreen.tsx');
  const employeeSettings = read('src/features/settings/SettingsScreen.tsx');
  const employees = read('src/features/employees/EmployeeListScreen.tsx');
  const performance = read('src/features/employees/PerformanceDashboard.tsx');

  assert.equal(employeeSales.includes('Sales overview'), false);
  assert.equal(employeeSales.includes('Business filter'), false);
  assert.equal(employeeSales.includes('Unknown business'), false);
  assert.equal(ownerSettings.includes('POSly Terminal'), false);
  assert.equal(ownerSettings.includes('Owner settings'), false);
  assert.equal(employeeSettings.includes('POSly Terminal'), false);
  assert.equal(employeeSettings.includes('Employee settings'), false);
  assert.equal(analytics.includes('Business filter'), false);
  assert.equal(analytics.includes('+12.5%'), false);
  assert.equal(salesOverview.includes('Sales overview'), false);
  assert.equal(employees.includes('Team'), false);
  assert.equal(performance.includes('Team'), false);
});
