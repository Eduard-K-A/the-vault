import {
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  UpdateType,
  type AbstractPowerSyncDatabase,
} from '@powersync/react-native';

import { offlineConfig } from '@/config/offline';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import {
  buildCrudUploadPayload,
  buildFunctionInvokeOptions,
  buildUnsupportedUploadMessage,
  buildUploadFailureMessage,
  describeFunctionError,
  getUploadFunctionName,
  getFunctionAccessToken,
  isLikelySnapshotImportTransaction,
} from '@/powersync/uploadHelpers';
import { CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL, SYNC_IMPORT_MARKERS_TABLE, syncImportMarkerKey } from '@/powersync/importMarkers';
import { logCompleteSaleDebug, logPowerSyncBackground } from '@/utils/syncDebug';

interface CrudOperationLike {
  table: string;
  op: unknown;
  id: string;
  opData?: Record<string, unknown> | null;
}

function crudKey(table: string, id: string): string {
  return `${table}:${id}`;
}

async function getLocalRow(
  database: AbstractPowerSyncDatabase,
  table: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  return (await database.getOptional<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [id])) ?? null;
}

async function ensureSyncImportMarkersTable(database: AbstractPowerSyncDatabase): Promise<void> {
  await database.execute(CREATE_SYNC_IMPORT_MARKERS_TABLE_SQL, []);
}

async function consumeSyncImportMarker(
  database: AbstractPowerSyncDatabase,
  operation: CrudOperationLike,
): Promise<boolean> {
  const [tableName, rowId] = syncImportMarkerKey(operation.table, operation.id);
  const marker = await database.getOptional<{ row_id: string }>(
    `SELECT row_id FROM ${SYNC_IMPORT_MARKERS_TABLE} WHERE table_name = ? AND row_id = ?`,
    [tableName, rowId],
  );
  if (!marker) {
    return false;
  }

  await database.execute(`DELETE FROM ${SYNC_IMPORT_MARKERS_TABLE} WHERE table_name = ? AND row_id = ?`, [
    tableName,
    rowId,
  ]);
  return true;
}

function parseAuditPayload(row: Record<string, unknown>): Record<string, unknown> | null {
  if (!row.payload) {
    return null;
  }
  if (typeof row.payload === 'object') {
    return row.payload as Record<string, unknown>;
  }
  if (typeof row.payload !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(row.payload) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function rowString(row: Record<string, unknown> | null, key: string): string | null {
  const value = row?.[key];
  return typeof value === 'string' ? value : null;
}

async function getInventoryItemForLog(
  database: AbstractPowerSyncDatabase,
  inventoryLog: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  const productId = rowString(inventoryLog, 'product_id');
  const branchId = rowString(inventoryLog, 'branch_id');
  if (!productId || !branchId) {
    return null;
  }

  return (
    (await database.getOptional<Record<string, unknown>>(
      'SELECT * FROM inventory_items WHERE product_id = ? AND branch_id = ?',
      [productId, branchId],
    )) ??
    (await database.getOptional<Record<string, unknown>>(
      'SELECT * FROM fallback_inventory_items WHERE product_id = ? AND branch_id = ?',
      [productId, branchId],
    )) ??
    null
  );
}

async function withInventoryBusinessId(
  database: AbstractPowerSyncDatabase,
  inventoryItem: Record<string, unknown> | null,
  inventoryLog: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  if (!inventoryItem || inventoryItem.business_id) {
    return inventoryItem;
  }

  const productId = rowString(inventoryItem, 'product_id') ?? rowString(inventoryLog, 'product_id');
  const product =
    productId !== null
      ? await database.getOptional<Record<string, unknown>>('SELECT business_id FROM products WHERE id = ?', [
          productId,
        ])
      : null;
  if (!product?.business_id) {
    return inventoryItem;
  }

  return {
    ...inventoryItem,
    business_id: product.business_id,
  };
}

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const session = useAuthStore.getState();
    if (!session.accessToken || !offlineConfig.powerSyncUrl) {
      logPowerSyncBackground('fetchCredentials returned null', {
        hasAccessToken: Boolean(session.accessToken),
        hasPowerSyncUrl: Boolean(offlineConfig.powerSyncUrl),
      });
      return null;
    }

    logPowerSyncBackground('fetchCredentials returned credentials', {
      userId: session.userId,
      endpoint: offlineConfig.powerSyncUrl,
    });
    return {
      endpoint: offlineConfig.powerSyncUrl,
      token: session.accessToken,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      logPowerSyncBackground('uploadData skipped; Supabase client unavailable');
      return;
    }
    const accessToken = await getFunctionAccessToken(client, useAuthStore.getState().accessToken);
    if (!accessToken) {
      logPowerSyncBackground('uploadData skipped; no access token');
      return;
    }

    try {
      await ensureSyncImportMarkersTable(database);
      logPowerSyncBackground('uploadData started');

      for (;;) {
        const transaction = await database.getNextCrudTransaction();
        if (!transaction) {
          logPowerSyncBackground('uploadData completed; no pending transaction');
          break;
        }

        try {
          const operations = transaction.crud as CrudOperationLike[];
          logPowerSyncBackground('upload transaction found', {
            operationCount: operations.length,
            operations: operations.map((operation) => ({
              table: operation.table,
              op: String(operation.op),
              id: operation.id,
            })),
          });
          if (isLikelySnapshotImportTransaction(operations, UpdateType.DELETE)) {
            logPowerSyncBackground('discarding stale snapshot import transaction', {
              operationCount: operations.length,
            });
            await transaction.complete();
            continue;
          }

          const handled = new Set<string>();
          const rowsByKey = new Map<string, Record<string, unknown> | null>();
          const getRow = async (op: CrudOperationLike) => {
            const key = crudKey(op.table, op.id);
            if (!rowsByKey.has(key)) {
              rowsByKey.set(key, await getLocalRow(database, op.table, op.id));
            }
            return rowsByKey.get(key) ?? null;
          };
          const invokeUpload = async (
            op: CrudOperationLike,
            functionName: string,
            payload: Record<string, unknown>,
          ) => {
            logPowerSyncBackground('edge function upload started', {
              table: op.table,
              op: String(op.op),
              id: op.id,
              functionName,
              payloadKeys: Object.keys(payload),
            });
            const { error } = await client.functions.invoke(
              functionName,
              buildFunctionInvokeOptions(
                {
                  op: op.op,
                  payload,
                },
                accessToken,
              ),
            );
            if (error) {
              const details = await describeFunctionError(error);
              const message = buildUploadFailureMessage({
                table: op.table,
                op: op.op,
                id: op.id,
                functionName,
                details,
              });
              console.error(message);
              logPowerSyncBackground('edge function upload failed', {
                table: op.table,
                op: String(op.op),
                id: op.id,
                functionName,
                details,
              });
              const uploadError = new Error(message);
              (uploadError as Error & { cause?: unknown }).cause = error;
              throw uploadError;
            }
            logPowerSyncBackground('edge function upload completed', {
              table: op.table,
              op: String(op.op),
              id: op.id,
              functionName,
            });
          };

          logPowerSyncBackground('uploading transaction', { operationCount: operations.length });

          for (const op of operations) {
            if (await consumeSyncImportMarker(database, op)) {
              logPowerSyncBackground('skipping imported operation', {
                table: op.table,
                op: String(op.op),
                id: op.id,
              });
              handled.add(crudKey(op.table, op.id));
            }
          }

          for (const op of operations.filter((entry) => entry.table === 'sales' && entry.op !== UpdateType.DELETE)) {
            if (handled.has(crudKey(op.table, op.id))) {
              continue;
            }
            const sale = await getRow(op);
            const saleId = rowString(sale, 'id') ?? op.id;
            const saleItems: Record<string, unknown>[] = [];
            const payments: Record<string, unknown>[] = [];
            const inventoryLogs: Record<string, unknown>[] = [];
            const inventoryItems: Record<string, unknown>[] = [];
            const auditLogs: Record<string, unknown>[] = [];

            for (const candidate of operations) {
              const row = await getRow(candidate);
              if (!row) {
                continue;
              }
              if (candidate.table === 'sale_items' && row.sale_id === saleId) {
                saleItems.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              } else if (candidate.table === 'payments' && row.sale_id === saleId) {
                payments.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              } else if (candidate.table === 'inventory_logs' && row.reference_id === saleId) {
                inventoryLogs.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              } else if (candidate.table === 'audit_logs' && parseAuditPayload(row)?.saleId === saleId) {
                auditLogs.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              }
            }

            for (const candidate of operations) {
              if (candidate.table !== 'inventory_items') {
                continue;
              }
              const row = await getRow(candidate);
              if (
                row &&
                inventoryLogs.some(
                  (log) => log.product_id === row.product_id && log.branch_id === row.branch_id,
                )
              ) {
                inventoryItems.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              }
            }

            for (const log of inventoryLogs) {
              if (
                inventoryItems.some(
                  (item) => item.product_id === log.product_id && item.branch_id === log.branch_id,
                )
              ) {
                continue;
              }
              const inventoryItem = await getInventoryItemForLog(database, log);
              if (inventoryItem) {
                inventoryItems.push(inventoryItem);
              }
            }

            logCompleteSaleDebug(saleId, 'upload bundle prepared', {
              operationId: op.id,
              businessId: rowString(sale, 'business_id'),
              branchId: rowString(sale, 'branch_id'),
              employeeId: rowString(sale, 'employee_id'),
              idempotencyKey: rowString(sale, 'idempotency_key'),
              saleItemCount: saleItems.length,
              paymentCount: payments.length,
              inventoryLogCount: inventoryLogs.length,
              inventoryItemCount: inventoryItems.length,
              auditLogCount: auditLogs.length,
              saleItemIds: saleItems.map((row) => row.id),
              paymentIds: payments.map((row) => row.id),
              inventoryLogIds: inventoryLogs.map((row) => row.id),
              inventoryItemIds: inventoryItems.map((row) => row.id),
              auditLogIds: auditLogs.map((row) => row.id),
            });
            await invokeUpload(op, 'commit_sale', {
              sale,
              sale_items: saleItems,
              payments,
              inventory_logs: inventoryLogs,
              inventory_items: inventoryItems,
              audit_logs: auditLogs,
            });
            handled.add(crudKey(op.table, op.id));
          }

          for (const op of operations.filter((entry) => entry.table === 'refunds' && entry.op !== UpdateType.DELETE)) {
            if (handled.has(crudKey(op.table, op.id))) {
              continue;
            }
            const refund = await getRow(op);
            const refundId = rowString(refund, 'id') ?? op.id;
            const refundItems: Record<string, unknown>[] = [];
            const inventoryLogs: Record<string, unknown>[] = [];
            const inventoryItems: Record<string, unknown>[] = [];
            const auditLogs: Record<string, unknown>[] = [];

            for (const candidate of operations) {
              const row = await getRow(candidate);
              if (!row) {
                continue;
              }
              if (candidate.table === 'refund_items' && row.refund_id === refundId) {
                refundItems.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              } else if (candidate.table === 'inventory_logs' && row.reference_id === refundId) {
                inventoryLogs.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              } else if (candidate.table === 'audit_logs' && parseAuditPayload(row)?.refundId === refundId) {
                auditLogs.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              }
            }

            for (const candidate of operations) {
              if (candidate.table !== 'inventory_items') {
                continue;
              }
              const row = await getRow(candidate);
              if (
                row &&
                inventoryLogs.some(
                  (log) => log.product_id === row.product_id && log.branch_id === row.branch_id,
                )
              ) {
                inventoryItems.push(row);
                handled.add(crudKey(candidate.table, candidate.id));
              }
            }

            await invokeUpload(op, 'create_refund', {
              refund,
              refund_items: refundItems,
              inventory_logs: inventoryLogs,
              inventory_items: inventoryItems,
              audit_logs: auditLogs,
            });
            handled.add(crudKey(op.table, op.id));
          }

          for (const op of operations.filter((entry) => entry.table === 'products' && entry.op !== UpdateType.DELETE)) {
            if (handled.has(crudKey(op.table, op.id))) {
              continue;
            }
            const localRow = await getRow(op);
            const payload = buildCrudUploadPayload(
              {
                table: op.table,
                id: op.id,
                opData: op.opData as Record<string, unknown> | null,
              },
              localRow,
            );

            await invokeUpload(op, 'save_product', payload);
            handled.add(crudKey(op.table, op.id));
          }

          for (const op of operations.filter((entry) => entry.table === 'inventory_logs' && entry.op !== UpdateType.DELETE)) {
            if (handled.has(crudKey(op.table, op.id))) {
              continue;
            }
            const inventoryLog = await getRow(op);
            let inventoryItem: Record<string, unknown> | null = null;
            for (const candidate of operations) {
              if (candidate.table !== 'inventory_items') {
                continue;
              }
              const row = await getRow(candidate);
              if (row?.product_id === inventoryLog?.product_id && row?.branch_id === inventoryLog?.branch_id) {
                inventoryItem = row;
                handled.add(crudKey(candidate.table, candidate.id));
                break;
              }
            }

            if (!inventoryItem) {
              inventoryItem = await getInventoryItemForLog(database, inventoryLog);
            }

            if (inventoryItem && !inventoryItem.business_id) {
              inventoryItem = await withInventoryBusinessId(database, inventoryItem, inventoryLog);
            }

            await invokeUpload(op, 'apply_inventory_adjustment', {
              inventory_log: inventoryLog,
              inventory_item: inventoryItem,
            });
            handled.add(crudKey(op.table, op.id));
          }

          for (const op of operations) {
            if (handled.has(crudKey(op.table, op.id))) {
              continue;
            }
            const functionName = getUploadFunctionName(op.table, op.op, UpdateType.DELETE);
            if (op.op === UpdateType.DELETE && !functionName) {
              logPowerSyncBackground('skipping unsupported delete upload', {
                table: op.table,
                id: op.id,
              });
              continue;
            }

            if (!functionName) {
              throw new Error(
                buildUnsupportedUploadMessage({
                  table: op.table,
                  op: op.op,
                  id: op.id,
                }),
              );
            }

            const localRow = op.op !== UpdateType.DELETE ? await getRow(op) : null;
            const payload = buildCrudUploadPayload(
              {
                table: op.table,
                id: op.id,
                opData: op.opData as Record<string, unknown> | null,
              },
              localRow,
            );

            await invokeUpload(op, functionName, payload);
          }

          await transaction.complete();
          logPowerSyncBackground('upload transaction completed');
        } catch (error) {
          logPowerSyncBackground('upload transaction failed', {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error instanceof Error ? error : new Error('PowerSync upload failed');
        }
      }
    } catch (error) {
      logPowerSyncBackground('uploadData failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof Error ? error : new Error('PowerSync upload failed');
    }
  }
}
