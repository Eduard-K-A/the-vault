import { powersync as powersyncDatabase } from '@/powersync';
import { getBusinessDeletionStatements } from '@/db/businessDeletionHelpers';
import { buildSaleInventoryLookupQuery } from '@/db/queries/inventoryQueries';
import { buildBusinessOwnerLookup, resolveProductAuditUserIds } from '@/db/productSnapshotHelpers';
import {
  CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL,
  SYNC_IMPORT_MARKERS_TABLE,
  markExistingRowsAsSyncImports,
  syncImportMarkerKey,
} from '@/powersync/importMarkers';
import { logBusinessRefreshDebug } from '@/utils/syncDebug';
import { logCompleteSaleDebug } from '@/utils/syncDebug';
import type {
  AuditLog,
  Branch,
  Business,
  BusinessMember,
  Category,
  InventoryLog,
  InventoryRecord,
  Payment,
  PaymentMethod,
  Product,
  Refund,
  RefundItem,
  Sale,
  SaleItem,
  SaleStatus,
  UserRole,
} from '@/types/models';
import { generateUUID } from '@/utils/generateUUID';

export { powersync } from '@/powersync';

export interface LocalTransaction {
  addAuditLog: (log: AuditLog) => Promise<void>;
  addBusinessMember: (input: {
    id?: string;
    businessId: string;
    userId: string;
    role: UserRole;
    branchId?: string | null;
  }) => Promise<BusinessMember>;
  applyInventoryAdjustment: (input: {
    productId: string;
    branchId: string;
    delta: number;
    reason: 'restock' | 'damage' | 'loss' | 'correction' | 'sale_decrement' | 'refund_return' | 'initial_count';
    notes: string | null;
    actorId: string;
    referenceId?: string | null;
  }) => Promise<InventoryLog>;
  archiveProduct: (productId: string, actorId: string) => Promise<void>;
  createBusiness: (input: {
    name: string;
    ownerId: string;
    address?: string | null;
    branchName?: string;
  }) => Promise<Business>;
  createBranch: (input: {
    businessId: string;
    name: string;
    actorId: string;
  }) => Promise<Branch>;
  deleteBusiness: (input: {
    businessId: string;
  }) => Promise<void>;
  deleteBranch: (input: {
    branchId: string;
  }) => Promise<void>;
  createSale: (input: {
    sale: Sale;
    items: SaleItem[];
    actorId: string;
    payments?: Array<{ method: PaymentMethod; amount_peso: number }>;
    checkoutTraceId?: string;
  }) => Promise<Sale>;
  createRefund: (input: {
    originalSaleId: string;
    branchId: string;
    businessId: string;
    reason: string;
    actorId: string;
    sourceDeviceId: string;
  }) => Promise<Refund>;
  initializeInventory: (input: {
    productId: string;
    branchId: string;
    quantity: number;
    actorId: string;
  }) => Promise<InventoryLog>;
  markSaleSynced: (saleId: string) => Promise<void>;
  restockInventory: (input: {
    productId: string;
    branchId: string;
    quantity: number;
    actorId: string;
    referenceId?: string | null;
  }) => Promise<InventoryLog>;
  removeBusinessMember: (input: {
    businessId: string;
    userId: string;
    actorId: string;
  }) => Promise<void>;
  upsertProfile: (profile: {
    id: string;
    fullname: string;
    email: string;
    role: UserRole;
    phone_number: string | null;
    avatar_url: string | null;
    created_at: string;
  }) => Promise<void>;
  upsertProduct: (product: Product, actorId: string) => Promise<Product>;
}

function now(): string {
  return new Date().toISOString();
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateJoinCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let joinCode = '';
  for (let index = 0; index < 6; index += 1) {
    joinCode += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return joinCode;
}

function generateReferenceNumber(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function ensureInventoryRow(tx: any, productId: string, branchId: string): Promise<InventoryRecord> {
  const existing = (await tx.getOptional('SELECT * FROM inventory_items WHERE product_id = ? AND branch_id = ?', [
    productId,
    branchId,
  ])) as InventoryRecord | null;
  if (existing) {
    if (!existing.business_id) {
      const product = (await tx.getOptional('SELECT business_id FROM products WHERE id = ?', [productId])) as
        | { business_id: string | null }
        | null;
      if (product?.business_id) {
        await tx.execute('UPDATE inventory_items SET business_id = ? WHERE id = ?', [product.business_id, existing.id]);
        return {
          ...existing,
          business_id: product.business_id,
        };
      }
    }
    return existing;
  }

  const product = (await tx.getOptional('SELECT business_id FROM products WHERE id = ?', [productId])) as
    | { business_id: string | null }
    | null;
  const row: InventoryRecord = {
    id: generateUUID(),
    product_id: productId,
    branch_id: branchId,
    business_id: product?.business_id ?? undefined,
    stock_quantity: 0,
    low_stock_threshold: 10,
    updated_at: now(),
  };
  await tx.execute(
    'INSERT INTO inventory_items (id, product_id, branch_id, business_id, stock_quantity, low_stock_threshold, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [row.id, row.product_id, row.branch_id, row.business_id ?? null, row.stock_quantity, row.low_stock_threshold, row.updated_at],
  );
  return row;
}

type SaleInventoryRecord = InventoryRecord & {
  source_table?: 'inventory_items' | 'fallback_inventory_items';
};

async function getSaleInventoryRecord(tx: any, productId: string, branchId: string): Promise<SaleInventoryRecord | null> {
  const lookup = buildSaleInventoryLookupQuery(productId, branchId);
  return (await tx.getOptional(lookup.sql, lookup.parameters)) as SaleInventoryRecord | null;
}

async function updateSaleInventoryStock(
  tx: any,
  inventory: SaleInventoryRecord,
  productId: string,
  branchId: string,
  quantity: number,
): Promise<void> {
  const table = inventory.source_table === 'fallback_inventory_items' ? 'fallback_inventory_items' : 'inventory_items';

  await tx.execute(`UPDATE ${table} SET stock_quantity = ?, updated_at = ? WHERE product_id = ? AND branch_id = ?`, [
    quantity,
    now(),
    productId,
    branchId,
  ]);
}

async function writeAuditLog(tx: any, log: AuditLog): Promise<void> {
  const payload = log.payload as Record<string, unknown>;
  await tx.execute(
    'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      log.id,
      log.business_id,
      log.branch_id ?? null,
      log.actor_id,
      log.event_type,
      JSON.stringify(payload),
      log.created_at,
      log.source_device_id ?? null,
    ],
  );
}

async function ensureSyncImportMarkersTable(tx: any): Promise<void> {
  await tx.execute(CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL, []);
}

async function markSyncImportRow(tx: any, table: string, row: unknown): Promise<void> {
  if (!row || typeof row !== 'object') {
    return;
  }

  const id = (row as { id?: unknown }).id;
  if (typeof id !== 'string') {
    return;
  }

  await tx.execute(`INSERT OR REPLACE INTO ${SYNC_IMPORT_MARKERS_TABLE} (table_name, row_id) VALUES (?, ?)`, [
    ...syncImportMarkerKey(table, id),
  ]);
}

function toCategoryId(categoryId: string | null | undefined): string | null {
  return categoryId ?? null;
}

async function buildTransaction(tx: any): Promise<LocalTransaction> {
  return {
    addAuditLog: async (log) => {
      await writeAuditLog(tx, log);
    },
    addBusinessMember: async (input) => {
      const member: BusinessMember = {
        id: input.id ?? generateUUID(),
        business_id: input.businessId,
        user_id: input.userId,
        role: input.role,
        branch_id: input.branchId ?? null,
        joined_at: now(),
        is_active: true,
      };
      await tx.execute(
        'INSERT OR REPLACE INTO business_members (id, business_id, user_id, role, branch_id, is_active, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [member.id, member.business_id, member.user_id, member.role, member.branch_id, 1, member.joined_at],
      );
      return member;
    },
    applyInventoryAdjustment: async (input) => {
      const inventory = await ensureInventoryRow(tx, input.productId, input.branchId);
      const quantityBefore = inventory.stock_quantity;
      const quantityAfter = quantityBefore + input.delta;
      if (quantityAfter < 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }
      await tx.execute(
        'UPDATE inventory_items SET stock_quantity = ?, updated_at = ? WHERE product_id = ? AND branch_id = ?',
        [quantityAfter, now(), input.productId, input.branchId],
      );
      const log: InventoryLog = {
        id: generateUUID(),
        product_id: input.productId,
        branch_id: input.branchId,
        action_type:
          input.reason === 'sale_decrement'
            ? 'sale'
            : input.reason === 'refund_return'
              ? 'refund'
              : input.reason === 'restock'
                ? 'restock'
                : 'adjustment',
        quantity_before: quantityBefore,
        quantity_changed: input.delta,
        quantity_after: quantityAfter,
        reference_type: input.referenceId ? 'sale' : input.reason === 'restock' ? 'manual' : 'system',
        reference_id: input.referenceId ?? null,
        performed_by: input.actorId,
        created_at: now(),
      };
      await tx.execute(
        'INSERT INTO inventory_logs (id, product_id, branch_id, action_type, quantity_before, quantity_changed, quantity_after, reference_type, reference_id, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          log.id,
          log.product_id,
          log.branch_id,
          log.action_type,
          log.quantity_before,
          log.quantity_changed,
          log.quantity_after,
          log.reference_type,
          log.reference_id,
          log.performed_by,
          log.created_at,
        ],
      );
      return log;
    },
    archiveProduct: async (productId, actorId) => {
      const product = (await tx.getOptional('SELECT * FROM products WHERE id = ?', [productId])) as Product | null;
      if (!product) {
        return;
      }
      await tx.execute(
        'UPDATE products SET is_active = 0, is_archived = 1, version = COALESCE(version, 1) + 1, updated_at = ?, last_modified_by = ? WHERE id = ?',
        [now(), actorId, productId],
      );
      await tx.execute(
        'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateUUID(),
          product.business_id,
          null,
          actorId,
          'product_archived',
          JSON.stringify({ productId }),
          now(),
          null,
        ],
      );
    },
    createBusiness: async (input) => {
      const business: Business = {
        id: generateUUID(),
        name: input.name,
        owner_id: input.ownerId,
        join_code: generateJoinCode(),
        logo_url: null,
        address: input.address ?? null,
        is_active: true,
        created_at: now(),
      };
      const branch = {
        id: generateUUID(),
        business_id: business.id,
        name: input.branchName ?? 'Main Branch',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      } as Branch & { created_at: string; updated_at: string };
      await tx.execute(
        'INSERT INTO businesses (id, name, owner_id, join_code, logo_url, address, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          business.id,
          business.name,
          business.owner_id,
          business.join_code,
          business.logo_url,
          business.address,
          business.is_active ? 1 : 0,
          business.created_at,
        ],
      );
      await tx.execute(
        'INSERT INTO branches (id, business_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [branch.id, branch.business_id, branch.name, 1, branch.created_at, branch.updated_at],
      );
      await tx.execute(
        'INSERT INTO business_members (id, business_id, user_id, role, branch_id, is_active, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [generateUUID(), business.id, input.ownerId, 'owner', branch.id, 1, now()],
      );
      await tx.execute(
        'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateUUID(),
          business.id,
          branch.id,
          input.ownerId,
          'business_created',
          JSON.stringify({
            business_name: business.name,
            branch_name: branch.name,
            join_code: business.join_code,
          }),
          now(),
          null,
        ],
      );
      return business;
    },
    createBranch: async (input) => {
      const branch = {
        id: generateUUID(),
        business_id: input.businessId,
        name: input.name,
        is_active: true,
        created_at: now(),
        updated_at: now(),
      } as Branch & { created_at: string; updated_at: string };
      await tx.execute(
        'INSERT INTO branches (id, business_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [branch.id, branch.business_id, branch.name, 1, branch.created_at, branch.updated_at],
      );
      await tx.execute(
        'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateUUID(),
          input.businessId,
          branch.id,
          input.actorId,
          'branch_created',
          JSON.stringify({ name: input.name, branchId: branch.id }),
          now(),
          null,
        ],
      );
      return branch;
    },
    deleteBranch: async (input) => {
      await tx.execute('DELETE FROM branches WHERE id = ?', [input.branchId]);
    },
    deleteBusiness: async (input) => {
      for (const statement of getBusinessDeletionStatements()) {
        await tx.execute(statement.sql, statement.params(input.businessId));
      }
    },
    createSale: async (input) => {
      logCompleteSaleDebug(input.checkoutTraceId, 'db createSale started', {
        saleId: input.sale.id,
        businessId: input.sale.business_id,
        branchId: input.sale.branch_id,
        itemCount: input.items.length,
        paymentCount: input.payments?.length ?? 0,
      });
      const sale = {
        ...input.sale,
        synced_at: null,
        reference_number: input.sale.reference_number ?? generateReferenceNumber('TXN'),
        vat_amount: roundMoney(input.sale.vat_amount ?? (input.sale.total_amount - input.sale.total_amount / 1.12)),
        idempotency_key: input.sale.idempotency_key ?? generateUUID(),
      } as Sale;

      for (const item of input.items) {
        const inventory = await getSaleInventoryRecord(tx, item.product_id, sale.branch_id);
        logCompleteSaleDebug(input.checkoutTraceId, 'stock check', {
          saleId: sale.id,
          productId: item.product_id,
          branchId: sale.branch_id,
          requestedQuantity: item.quantity,
          availableQuantity: inventory?.stock_quantity ?? null,
          inventoryId: inventory?.id ?? null,
          inventorySource: inventory?.source_table ?? null,
        });
        if (!inventory || inventory.stock_quantity < item.quantity) {
          logCompleteSaleDebug(input.checkoutTraceId, 'stock check failed', {
            saleId: sale.id,
            productId: item.product_id,
            branchId: sale.branch_id,
            requestedQuantity: item.quantity,
            availableQuantity: inventory?.stock_quantity ?? null,
            inventorySource: inventory?.source_table ?? null,
          });
          throw new Error('INSUFFICIENT_STOCK');
        }
      }

      logCompleteSaleDebug(input.checkoutTraceId, 'inserting sale row', {
        saleId: sale.id,
        referenceNumber: sale.reference_number,
        idempotencyKey: sale.idempotency_key,
        vatAmount: sale.vat_amount ?? 0,
      });
      await tx.execute(
        'INSERT INTO sales (id, business_id, branch_id, employee_id, total_amount, discount_amount, payment_method, status, notes, created_at, synced_at, reference_number, vat_amount, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          sale.id,
          sale.business_id,
          sale.branch_id,
          sale.employee_id,
          sale.total_amount,
          sale.discount_amount,
          sale.payment_method,
          sale.status,
          sale.notes,
          sale.created_at,
          sale.synced_at,
          sale.reference_number,
          sale.vat_amount ?? 0,
          sale.idempotency_key ?? null,
        ],
      );

      await tx.execute('DELETE FROM sale_items WHERE sale_id = ?', [sale.id]);
      await tx.execute('DELETE FROM payments WHERE sale_id = ?', [sale.id]);

      for (const item of input.items) {
        logCompleteSaleDebug(input.checkoutTraceId, 'inserting sale item', {
          saleId: sale.id,
          saleItemId: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          subtotal: item.subtotal,
        });
        await tx.execute(
          'INSERT INTO sale_items (id, sale_id, product_id, business_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [item.id, item.sale_id, item.product_id, sale.business_id, item.quantity, item.unit_price, item.subtotal],
        );

        const inventory = await getSaleInventoryRecord(tx, item.product_id, sale.branch_id);
        if (!inventory) {
          continue;
        }
        const before = inventory.stock_quantity;
        const after = Math.max(0, before - item.quantity);
        logCompleteSaleDebug(input.checkoutTraceId, 'updating inventory after sale item', {
          saleId: sale.id,
          productId: item.product_id,
          branchId: sale.branch_id,
          inventoryId: inventory.id,
          inventorySource: inventory.source_table ?? null,
          quantityBefore: before,
          quantityChanged: -item.quantity,
          quantityAfter: after,
        });
        await updateSaleInventoryStock(tx, inventory, item.product_id, sale.branch_id, after);
        await tx.execute(
          'INSERT INTO inventory_logs (id, product_id, branch_id, action_type, quantity_before, quantity_changed, quantity_after, reference_type, reference_id, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            generateUUID(),
            item.product_id,
            sale.branch_id,
            'sale',
            before,
            -item.quantity,
            after,
            'sale',
            sale.id,
            input.actorId,
            now(),
          ],
        );
      }

      const payments: Payment[] =
        input.payments && input.payments.length > 0
          ? input.payments.map((payment) => ({
              id: generateUUID(),
              sale_id: sale.id,
              business_id: sale.business_id,
              method: payment.method,
              amount_peso: payment.amount_peso,
            }))
          : [
              {
                id: generateUUID(),
                sale_id: sale.id,
                business_id: sale.business_id,
                method: sale.payment_method,
                amount_peso: sale.total_amount,
              },
            ];
      for (const payment of payments) {
        logCompleteSaleDebug(input.checkoutTraceId, 'inserting payment', {
          saleId: sale.id,
          paymentId: payment.id,
          method: payment.method,
          amount_peso: payment.amount_peso,
        });
        await tx.execute(
          'INSERT INTO payments (id, sale_id, business_id, method, amount_peso) VALUES (?, ?, ?, ?, ?)',
          [payment.id, payment.sale_id, payment.business_id, payment.method, payment.amount_peso],
        );
      }

      logCompleteSaleDebug(input.checkoutTraceId, 'inserting sale audit log', {
        saleId: sale.id,
        businessId: sale.business_id,
        branchId: sale.branch_id,
      });
      await tx.execute(
        'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateUUID(),
          sale.business_id,
          sale.branch_id,
          input.actorId,
          'sale_created',
          JSON.stringify({
            saleId: sale.id,
            totalAmount: sale.total_amount,
            paymentMethod: sale.payment_method,
            referenceNumber: sale.reference_number,
          }),
          now(),
          null,
        ],
      );
      logCompleteSaleDebug(input.checkoutTraceId, 'db createSale completed', { saleId: sale.id });
      return sale;
    },
    createRefund: async (input) => {
      const originalSale = (await tx.getOptional('SELECT * FROM sales WHERE id = ?', [input.originalSaleId])) as Sale | null;
      if (!originalSale) {
        throw new Error('SALE_NOT_FOUND');
      }
      if (originalSale.status === 'refunded') {
        throw new Error('ALREADY_REFUNDED');
      }

      const saleItems = (await tx.getAll('SELECT * FROM sale_items WHERE sale_id = ?', [originalSale.id])) as SaleItem[];
      const totalPeso = roundMoney(saleItems.reduce((sum: number, item: SaleItem) => sum + item.subtotal, 0));
      const refund: Refund = {
        id: generateUUID(),
        idempotency_key: generateUUID(),
        original_sale_id: originalSale.id,
        branch_id: input.branchId,
        business_id: input.businessId,
        reason: input.reason,
        total_peso: totalPeso,
        created_at: now(),
        created_by: input.actorId,
        source_device_id: input.sourceDeviceId,
        reference_number: generateReferenceNumber('RFN'),
      };

      await tx.execute(
        'INSERT INTO refunds (id, idempotency_key, original_sale_id, branch_id, business_id, reason, total_peso, created_at, created_by, source_device_id, reference_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          refund.id,
          refund.idempotency_key,
          refund.original_sale_id,
          refund.branch_id,
          refund.business_id,
          refund.reason,
          refund.total_peso,
          refund.created_at,
          refund.created_by,
          refund.source_device_id,
          refund.reference_number,
        ],
      );
      await tx.execute('DELETE FROM refund_items WHERE refund_id = ?', [refund.id]);

      for (const item of saleItems) {
        await tx.execute(
          'INSERT INTO refund_items (id, refund_id, sale_item_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [generateUUID(), refund.id, item.id, item.product_id, item.quantity, item.unit_price, item.subtotal],
        );
        const inventory = await ensureInventoryRow(tx, item.product_id, input.branchId);
        const after = inventory.stock_quantity + item.quantity;
        await tx.execute(
          'UPDATE inventory_items SET stock_quantity = ?, updated_at = ? WHERE product_id = ? AND branch_id = ?',
          [after, now(), item.product_id, input.branchId],
        );
        await tx.execute(
          'INSERT INTO inventory_logs (id, product_id, branch_id, action_type, quantity_before, quantity_changed, quantity_after, reference_type, reference_id, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            generateUUID(),
            item.product_id,
            input.branchId,
            'refund',
            inventory.stock_quantity,
            item.quantity,
            after,
            'sale',
            refund.id,
            input.actorId,
            now(),
          ],
        );
      }

      await tx.execute('UPDATE sales SET status = ?, synced_at = NULL WHERE id = ?', ['refunded', originalSale.id]);
      await tx.execute(
        'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateUUID(),
          input.businessId,
          input.branchId,
          input.actorId,
          'sale_refunded',
          JSON.stringify({
            originalSaleId: input.originalSaleId,
            refundId: refund.id,
            totalPeso: refund.total_peso,
            reason: input.reason,
          }),
          now(),
          input.sourceDeviceId,
        ],
      );
      return refund;
    },
    initializeInventory: async (input) => {
      const inventory = await ensureInventoryRow(tx, input.productId, input.branchId);
      const before = inventory.stock_quantity;
      const after = input.quantity;
      await tx.execute(
        'UPDATE inventory_items SET stock_quantity = ?, updated_at = ? WHERE product_id = ? AND branch_id = ?',
        [after, now(), input.productId, input.branchId],
      );
      const log: InventoryLog = {
        id: generateUUID(),
        product_id: input.productId,
        branch_id: input.branchId,
        action_type: 'initial',
        quantity_before: before,
        quantity_changed: after - before,
        quantity_after: after,
        reference_type: 'system',
        reference_id: null,
        performed_by: input.actorId,
        created_at: now(),
      };
      await tx.execute(
        'INSERT INTO inventory_logs (id, product_id, branch_id, action_type, quantity_before, quantity_changed, quantity_after, reference_type, reference_id, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          log.id,
          log.product_id,
          log.branch_id,
          log.action_type,
          log.quantity_before,
          log.quantity_changed,
          log.quantity_after,
          log.reference_type,
          log.reference_id,
          log.performed_by,
          log.created_at,
        ],
      );
      return log;
    },
    markSaleSynced: async (saleId) => {
      await tx.execute('UPDATE sales SET synced_at = ? WHERE id = ?', [now(), saleId]);
    },
    restockInventory: async (input) => {
      const inventory = await ensureInventoryRow(tx, input.productId, input.branchId);
      const quantityBefore = inventory.stock_quantity;
      const quantityAfter = quantityBefore + Math.max(0, input.quantity);
      await tx.execute(
        'UPDATE inventory_items SET stock_quantity = ?, updated_at = ? WHERE product_id = ? AND branch_id = ?',
        [quantityAfter, now(), input.productId, input.branchId],
      );
      const log: InventoryLog = {
        id: generateUUID(),
        product_id: input.productId,
        branch_id: input.branchId,
        action_type: 'restock',
        quantity_before: quantityBefore,
        quantity_changed: Math.max(0, input.quantity),
        quantity_after: quantityAfter,
        reference_type: input.referenceId ? 'sale' : 'manual',
        reference_id: input.referenceId ?? null,
        performed_by: input.actorId,
        created_at: now(),
      };
      await tx.execute(
        'INSERT INTO inventory_logs (id, product_id, branch_id, action_type, quantity_before, quantity_changed, quantity_after, reference_type, reference_id, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          log.id,
          log.product_id,
          log.branch_id,
          log.action_type,
          log.quantity_before,
          log.quantity_changed,
          log.quantity_after,
          log.reference_type,
          log.reference_id,
          log.performed_by,
          log.created_at,
        ],
      );
      return log;
    },
    removeBusinessMember: async (input) => {
      await tx.execute('UPDATE business_members SET is_active = 0 WHERE business_id = ? AND user_id = ?', [
        input.businessId,
        input.userId,
      ]);
      await tx.execute(
        'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateUUID(),
          input.businessId,
          null,
          input.actorId,
          'employee_removed',
          JSON.stringify({ userId: input.userId }),
          now(),
          null,
        ],
      );
    },
    upsertProfile: async (profile) => {
      await tx.execute(
        'INSERT OR REPLACE INTO profiles (id, fullname, email, role, phone_number, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [profile.id, profile.fullname, profile.email, profile.role, profile.phone_number, profile.avatar_url, profile.created_at],
      );
    },
    upsertProduct: async (product, actorId) => {
      const existing = (await tx.getOptional('SELECT * FROM products WHERE id = ?', [product.id])) as Product | null;
      const nextVersion = (existing?.version ?? 0) + 1;
      const nextProduct: Product = {
        ...product,
        version: nextVersion,
        is_active: product.is_active,
        is_archived: product.is_archived ?? !product.is_active,
        updated_at: now(),
      };
      await tx.execute(
        'INSERT OR REPLACE INTO products (id, business_id, category_id, name, barcode, sku, selling_price, cost_price, image_url, is_active, is_archived, version, description, created_at, updated_at, created_by, last_modified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          nextProduct.id,
          nextProduct.business_id,
          toCategoryId(nextProduct.category_id),
          nextProduct.name,
          nextProduct.barcode,
          nextProduct.sku,
          nextProduct.selling_price,
          nextProduct.cost_price,
          nextProduct.image_url,
          nextProduct.is_active ? 1 : 0,
          nextProduct.is_archived ? 1 : 0,
          nextProduct.version ?? 1,
          nextProduct.description ?? null,
          nextProduct.created_at,
          nextProduct.updated_at,
          actorId,
          actorId,
        ],
      );
      await tx.execute(
        'INSERT INTO audit_logs (id, business_id, branch_id, actor_id, event_type, payload, created_at, source_device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateUUID(),
          nextProduct.business_id,
          null,
          actorId,
          'product_edit',
          JSON.stringify({ before: existing, after: nextProduct }),
          now(),
          null,
        ],
      );
      return nextProduct;
    },
  };
}

export const db = {
  async writeTransaction<T>(operation: (tx: LocalTransaction) => Promise<T> | T): Promise<T> {
    return powersyncDatabase.writeTransaction(async (tx) => {
      const transaction = await buildTransaction(tx);
      return operation(transaction);
    });
  },
};

export async function applyBootstrapSnapshot(snapshot: {
  businesses?: Business[];
  branches?: Branch[];
  businessMembers?: BusinessMember[];
  categories?: Category[];
  products?: Product[];
  inventory?: InventoryRecord[];
  sales?: Sale[];
  saleItems?: SaleItem[];
  payments?: Payment[];
  refunds?: Refund[];
  refundItems?: RefundItem[];
  inventoryLogs?: InventoryLog[];
  auditLogs?: AuditLog[];
  profiles?: Array<{
    id: string;
    fullname: string;
    email: string;
    role?: UserRole | null;
    phone_number: string | null;
    avatar_url: string | null;
    created_at: string;
  }>;
  deviceSessions?: Array<{
    id: string;
    user_id: string;
    business_id: string | null;
    device_id: string;
    device_name: string | null;
    last_seen_at: string;
    created_at: string;
  }>;
}): Promise<void> {
  await writeBusinessSnapshot(snapshot, 'replace');
}

export async function applyBusinessSnapshot(snapshot: {
  businesses?: Business[];
  branches?: Branch[];
  businessMembers?: BusinessMember[];
  categories?: Category[];
  products?: Product[];
  inventory?: InventoryRecord[];
  sales?: Sale[];
  saleItems?: SaleItem[];
  payments?: Payment[];
  refunds?: Refund[];
  refundItems?: RefundItem[];
  inventoryLogs?: InventoryLog[];
  auditLogs?: AuditLog[];
  deviceSessions?: Array<{
    id: string;
    user_id: string;
    business_id: string | null;
    device_id: string;
    device_name: string | null;
    last_seen_at: string;
    created_at: string;
  }>;
}, traceId?: string): Promise<void> {
  await writeBusinessSnapshot(snapshot, 'merge', traceId);
}

export async function applyBusinessBootstrapSnapshot(snapshot: {
  businesses?: Business[];
  branches?: Branch[];
  businessMembers?: BusinessMember[];
  categories?: Category[];
  products?: Product[];
  inventory?: InventoryRecord[];
  sales?: Sale[];
  saleItems?: SaleItem[];
  payments?: Payment[];
  refunds?: Refund[];
  refundItems?: RefundItem[];
  inventoryLogs?: InventoryLog[];
  auditLogs?: AuditLog[];
  deviceSessions?: Array<{
    id: string;
    user_id: string;
    business_id: string | null;
    device_id: string;
    device_name: string | null;
    last_seen_at: string;
    created_at: string;
  }>;
}, traceId?: string): Promise<void> {
  await writeBusinessSnapshot(snapshot, 'replace', traceId);
}

async function getBusinessScopedLocalCounts(businessId: string | null): Promise<Record<string, number> | null> {
  if (!businessId) {
    return null;
  }

  const [products, inventory, branches, members] = await Promise.all([
    powersyncDatabase.getOptional<{ count: number }>('SELECT COUNT(*) AS count FROM products WHERE business_id = ?', [
      businessId,
    ]),
    powersyncDatabase.getOptional<{ count: number }>(
      'SELECT COUNT(*) AS count FROM inventory_items WHERE business_id = ?',
      [businessId],
    ),
    powersyncDatabase.getOptional<{ count: number }>('SELECT COUNT(*) AS count FROM branches WHERE business_id = ?', [
      businessId,
    ]),
    powersyncDatabase.getOptional<{ count: number }>(
      'SELECT COUNT(*) AS count FROM business_members WHERE business_id = ?',
      [businessId],
    ),
  ]);

  return {
    products: products?.count ?? 0,
    inventory: inventory?.count ?? 0,
    branches: branches?.count ?? 0,
    members: members?.count ?? 0,
  };
}

async function writeBusinessSnapshot(
  snapshot: {
    businesses?: Business[];
    branches?: Branch[];
    businessMembers?: BusinessMember[];
    categories?: Category[];
    products?: Product[];
    inventory?: InventoryRecord[];
    sales?: Sale[];
    saleItems?: SaleItem[];
    payments?: Payment[];
    refunds?: Refund[];
    refundItems?: RefundItem[];
    inventoryLogs?: InventoryLog[];
    auditLogs?: AuditLog[];
    profiles?: Array<{
      id: string;
      fullname: string;
      email: string;
      role?: UserRole | null;
      phone_number: string | null;
      avatar_url: string | null;
      created_at: string;
    }>;
    deviceSessions?: Array<{
      id: string;
      user_id: string;
      business_id: string | null;
      device_id: string;
      device_name: string | null;
      last_seen_at: string;
      created_at: string;
    }>;
  },
  mode: 'replace' | 'merge',
  traceId?: string,
): Promise<void> {
  const businessId = snapshot.businesses?.[0]?.id ?? snapshot.products?.[0]?.business_id ?? null;
  logBusinessRefreshDebug(traceId, 'local snapshot write started', {
    mode,
    businessId,
    incomingProducts: snapshot.products?.length ?? 0,
    incomingInventory: snapshot.inventory?.length ?? 0,
    incomingBranches: snapshot.branches?.length ?? 0,
    before: await getBusinessScopedLocalCounts(businessId),
  });
  await powersyncDatabase.writeTransaction(async (tx) => {
    await ensureSyncImportMarkersTable(tx);
    const businessOwnersById = buildBusinessOwnerLookup(snapshot.businesses ?? []);

    const writeRows = async <T>(
      localTx: any,
      table: BusinessSnapshotTable,
      rows: T[],
      toValues: (row: T) => unknown[],
    ): Promise<void> => {
      if (mode === 'replace') {
        await clearAndReplace(localTx, table, rows, toValues);
        return;
      }

      await upsertRows(localTx, table, SNAPSHOT_TABLE_COLUMNS[table], rows, toValues);
    };

    await writeRows(tx, 'profiles', snapshot.profiles ?? [], (row) => [
      row.id,
      row.fullname,
      row.email,
      row.role ?? 'employee',
      row.phone_number,
      row.avatar_url,
      row.created_at,
    ]);
    await writeRows(tx, 'businesses', snapshot.businesses ?? [], (row) => [
      row.id,
      row.name,
      row.owner_id,
      row.join_code,
      row.logo_url,
      row.address,
      row.is_active ? 1 : 0,
      row.created_at,
    ]);
    await writeRows(tx, 'branches', snapshot.branches ?? [], (row) => {
      const branchRow = row as Branch & { created_at?: string; updated_at?: string };
      return [
        branchRow.id,
        branchRow.business_id,
        branchRow.name,
        branchRow.is_active ? 1 : 0,
        branchRow.created_at ?? new Date().toISOString(),
        branchRow.updated_at ?? new Date().toISOString(),
      ];
    });
    await writeRows(tx, 'business_members', snapshot.businessMembers ?? [], (row) => [
      row.id,
      row.business_id,
      row.user_id,
      row.role,
      row.branch_id ?? null,
      row.is_active === false ? 0 : 1,
      row.joined_at,
    ]);
    await writeRows(tx, 'categories', snapshot.categories ?? [], (row) => [row.id, row.business_id, row.name]);
    await writeRows(tx, 'products', snapshot.products ?? [], (row) => [
      row.id,
      row.business_id,
      row.category_id ?? null,
      row.name,
      row.barcode,
      row.sku,
      row.selling_price,
      row.cost_price,
      row.image_url,
      row.is_active ? 1 : 0,
      row.is_archived ? 1 : 0,
      row.version ?? 1,
      row.description ?? null,
      row.created_at,
      row.updated_at,
      resolveProductAuditUserIds(row, businessOwnersById).createdBy,
      resolveProductAuditUserIds(row, businessOwnersById).lastModifiedBy,
    ]);
    await writeRows(tx, 'inventory_items', snapshot.inventory ?? [], (row) => [
      row.id,
      row.product_id,
      row.branch_id,
      row.business_id ?? null,
      row.stock_quantity,
      row.low_stock_threshold,
      row.updated_at,
    ]);
    await writeRows(tx, 'sales', snapshot.sales ?? [], (row) => [
      row.id,
      row.business_id,
      row.branch_id,
      row.employee_id,
      row.total_amount,
      row.discount_amount,
      row.payment_method,
      row.status,
      row.notes,
      row.created_at,
      row.synced_at,
      row.reference_number ?? null,
      row.vat_amount ?? null,
      row.idempotency_key ?? null,
    ]);
    await writeRows(tx, 'sale_items', snapshot.saleItems ?? [], (row) => {
      const saleItemRow = row as SaleItem & { business_id?: string };
      return [
        saleItemRow.id,
        saleItemRow.sale_id,
        saleItemRow.product_id,
        saleItemRow.business_id ?? null,
        saleItemRow.quantity,
        saleItemRow.unit_price,
        saleItemRow.subtotal,
      ];
    });
    await writeRows(tx, 'payments', snapshot.payments ?? [], (row) => [
      row.id,
      row.sale_id,
      row.business_id,
      row.method,
      row.amount_peso,
    ]);
    await writeRows(tx, 'refunds', snapshot.refunds ?? [], (row) => [
      row.id,
      row.idempotency_key,
      row.original_sale_id,
      row.branch_id,
      row.business_id,
      row.reason,
      row.total_peso,
      row.created_at,
      row.created_by,
      row.source_device_id,
      row.reference_number ?? null,
    ]);
    await writeRows(tx, 'refund_items', snapshot.refundItems ?? [], (row) => [
      row.id,
      row.refund_id,
      row.sale_item_id,
      row.product_id,
      row.quantity,
      row.unit_price,
      row.subtotal,
    ]);
    await writeRows(tx, 'inventory_logs', snapshot.inventoryLogs ?? [], (row) => [
      row.id,
      row.product_id,
      row.branch_id,
      row.action_type,
      row.quantity_before,
      row.quantity_changed,
      row.quantity_after,
      row.reference_type,
      row.reference_id,
      row.performed_by,
      row.created_at,
    ]);
    await writeRows(tx, 'audit_logs', snapshot.auditLogs ?? [], (row) => [
      row.id,
      row.business_id,
      row.branch_id ?? null,
      row.actor_id,
      row.event_type,
      JSON.stringify(row.payload),
      row.created_at,
      row.source_device_id ?? null,
    ]);
    await writeRows(tx, 'device_sessions', snapshot.deviceSessions ?? [], (row) => [
      row.id,
      row.user_id,
      row.business_id,
      row.device_id,
      row.device_name,
      row.last_seen_at,
      row.created_at,
    ]);
  });
  logBusinessRefreshDebug(traceId, 'local snapshot write completed', {
    mode,
    businessId,
    after: await getBusinessScopedLocalCounts(businessId),
  });
}

type BusinessSnapshotTable =
  | 'profiles'
  | 'businesses'
  | 'branches'
  | 'business_members'
  | 'categories'
  | 'products'
  | 'inventory_items'
  | 'sales'
  | 'sale_items'
  | 'payments'
  | 'refunds'
  | 'refund_items'
  | 'inventory_logs'
  | 'audit_logs'
  | 'device_sessions';

const SNAPSHOT_TABLE_COLUMNS: Record<BusinessSnapshotTable, string[]> = {
  profiles: ['id', 'fullname', 'email', 'role', 'phone_number', 'avatar_url', 'created_at'],
  businesses: ['id', 'name', 'owner_id', 'join_code', 'logo_url', 'address', 'is_active', 'created_at'],
  branches: ['id', 'business_id', 'name', 'is_active', 'created_at', 'updated_at'],
  business_members: ['id', 'business_id', 'user_id', 'role', 'branch_id', 'is_active', 'joined_at'],
  categories: ['id', 'business_id', 'name'],
  products: [
    'id',
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
  inventory_items: ['id', 'product_id', 'branch_id', 'business_id', 'stock_quantity', 'low_stock_threshold', 'updated_at'],
  sales: [
    'id',
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
  sale_items: ['id', 'sale_id', 'product_id', 'business_id', 'quantity', 'unit_price', 'subtotal'],
  payments: ['id', 'sale_id', 'business_id', 'method', 'amount_peso'],
  refunds: [
    'id',
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
  refund_items: ['id', 'refund_id', 'sale_item_id', 'product_id', 'quantity', 'unit_price', 'subtotal'],
  inventory_logs: [
    'id',
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
  audit_logs: ['id', 'business_id', 'branch_id', 'actor_id', 'event_type', 'payload', 'created_at', 'source_device_id'],
  device_sessions: ['id', 'user_id', 'business_id', 'device_id', 'device_name', 'last_seen_at', 'created_at'],
};

async function clearAndReplace(tx: any, table: string, rows: unknown[], toValues: (row: any) => unknown[]): Promise<void> {
  await markExistingRowsAsSyncImports(tx, table);
  await tx.execute(`DELETE FROM ${table}`, []);
  for (const row of rows) {
    await markSyncImportRow(tx, table, row);
    const values = toValues(row);
    const placeholders = values.map(() => '?').join(', ');
    await tx.execute(`INSERT INTO ${table} VALUES (${placeholders})`, values);
  }
}

async function upsertRows(
  tx: any,
  table: string,
  columns: string[],
  rows: unknown[],
  toValues: (row: any) => unknown[],
): Promise<void> {
  const columnList = columns.join(', ');
  for (const row of rows) {
    await markSyncImportRow(tx, table, row);
    const values = toValues(row);
    const placeholders = values.map(() => '?').join(', ');
    await tx.execute(`INSERT OR REPLACE INTO ${table} (${columnList}) VALUES (${placeholders})`, values);
  }
}
