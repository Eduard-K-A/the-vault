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
} from '@/powersync/uploadHelpers';

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

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const session = useAuthStore.getState();
    if (!session.accessToken || !offlineConfig.powerSyncUrl) {
      return null;
    }

    return {
      endpoint: offlineConfig.powerSyncUrl,
      token: session.accessToken,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    const accessToken = await getFunctionAccessToken(client, useAuthStore.getState().accessToken);
    if (!accessToken) {
      return;
    }

    try {
      for (;;) {
        const transaction = await database.getNextCrudTransaction();
        if (!transaction) {
          break;
        }

        try {
          const operations = transaction.crud as CrudOperationLike[];
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
            console.log(`[powersync] uploading ${op.op} on ${op.table} via ${functionName} (${op.id})`);
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
              const uploadError = new Error(message);
              (uploadError as Error & { cause?: unknown }).cause = error;
              throw uploadError;
            }
          };

          console.log(`[powersync] uploading transaction with ${operations.length} ops`);

          for (const op of operations.filter((entry) => entry.table === 'sales' && entry.op !== UpdateType.DELETE)) {
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
              console.log(`[powersync] skipping DELETE on ${op.table} (${op.id})`);
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
          console.log('[powersync] transaction completed');
        } catch (error) {
          throw error instanceof Error ? error : new Error('PowerSync upload failed');
        }
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('PowerSync upload failed');
    }
  }
}
