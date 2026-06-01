import { powersync } from '@/powersync';
import { hasRemoteSyncConfig } from '@/config/offline';

const REQUIRED_TABLES: Record<string, string[]> = {
  profiles: ['fullname', 'email', 'phone_number', 'avatar_url', 'created_at'],
  businesses: ['name', 'owner_id', 'join_code', 'logo_url', 'address', 'is_active', 'created_at'],
  branches: ['business_id', 'name', 'is_active', 'created_at', 'updated_at'],
  business_members: ['business_id', 'user_id', 'role', 'branch_id', 'is_active', 'joined_at'],
  categories: ['business_id', 'name'],
  products: [
    'business_id',
    'category_id',
    'name',
    'barcode',
    'sku',
    'selling_price',
    'cost_price',
    'image_url',
    'is_active',
    'is_archived',
    'version',
    'description',
    'created_at',
    'updated_at',
    'created_by',
    'last_modified_by',
  ],
  inventory_items: ['product_id', 'branch_id', 'business_id', 'stock_quantity', 'low_stock_threshold', 'updated_at'],
  inventory_logs: [
    'product_id',
    'branch_id',
    'action_type',
    'quantity_before',
    'quantity_changed',
    'quantity_after',
    'reference_type',
    'reference_id',
    'performed_by',
    'created_at',
  ],
  sales: [
    'business_id',
    'branch_id',
    'employee_id',
    'total_amount',
    'discount_amount',
    'payment_method',
    'status',
    'notes',
    'created_at',
    'synced_at',
    'reference_number',
    'vat_amount',
    'idempotency_key',
  ],
  sale_items: ['sale_id', 'product_id', 'business_id', 'quantity', 'unit_price', 'subtotal'],
  payments: ['sale_id', 'business_id', 'method', 'amount_peso'],
  refunds: [
    'idempotency_key',
    'original_sale_id',
    'branch_id',
    'business_id',
    'reason',
    'total_peso',
    'created_at',
    'created_by',
    'source_device_id',
    'reference_number',
  ],
  refund_items: ['refund_id', 'sale_item_id', 'product_id', 'quantity', 'unit_price', 'subtotal'],
  audit_logs: ['business_id', 'branch_id', 'actor_id', 'event_type', 'payload', 'created_at', 'source_device_id'],
  device_sessions: ['user_id', 'business_id', 'device_id', 'device_name', 'last_seen_at', 'created_at'],
};

export async function validateSyncBackend(): Promise<void> {
  if (!hasRemoteSyncConfig()) {
    return;
  }

  const tables = await powersync.getAll<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  const tableNames = new Set(tables.map((row) => row.name));
  const missingTables = Object.keys(REQUIRED_TABLES).filter((table) => !tableNames.has(table));
  if (missingTables.length > 0) {
    throw new Error(`PowerSync schema missing tables: ${missingTables.join(', ')}`);
  }

  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_TABLES)) {
    const columns = await powersync.getAll<{ name: string }>(`PRAGMA table_info(${tableName})`);
    const columnNames = new Set(columns.map((column) => column.name));
    const missingColumns = requiredColumns.filter((column) => !columnNames.has(column));
    if (missingColumns.length > 0) {
      throw new Error(`PowerSync schema missing columns for ${tableName}: ${missingColumns.join(', ')}`);
    }
  }
}
