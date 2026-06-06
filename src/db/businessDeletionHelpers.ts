export interface BusinessDeletionStatement {
  sql: string;
  params: (businessId: string) => unknown[];
}

export function getBusinessDeletionStatements(): BusinessDeletionStatement[] {
  const productIds = 'SELECT id FROM products WHERE business_id = ?';
  const branchIds = 'SELECT id FROM branches WHERE business_id = ?';
  const refundIds = 'SELECT id FROM refunds WHERE business_id = ?';

  return [
    { sql: `DELETE FROM refund_items WHERE refund_id IN (${refundIds})`, params: (businessId) => [businessId] },
    { sql: `DELETE FROM refund_items WHERE product_id IN (${productIds})`, params: (businessId) => [businessId] },
    { sql: 'DELETE FROM refunds WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM payments WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM sale_items WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM sales WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: `DELETE FROM inventory_logs WHERE product_id IN (${productIds})`, params: (businessId) => [businessId] },
    { sql: `DELETE FROM inventory_logs WHERE branch_id IN (${branchIds})`, params: (businessId) => [businessId] },
    { sql: 'DELETE FROM inventory_items WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: `DELETE FROM inventory_items WHERE product_id IN (${productIds})`, params: (businessId) => [businessId] },
    { sql: `DELETE FROM inventory_items WHERE branch_id IN (${branchIds})`, params: (businessId) => [businessId] },
    { sql: 'DELETE FROM audit_logs WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM device_sessions WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM business_members WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM products WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM categories WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM branches WHERE business_id = ?', params: (businessId) => [businessId] },
    { sql: 'DELETE FROM businesses WHERE id = ?', params: (businessId) => [businessId] },
  ];
}
