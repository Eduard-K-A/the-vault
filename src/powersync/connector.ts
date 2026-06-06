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
  buildUploadFailureMessage,
  describeFunctionError,
  getUploadFunctionName,
  getFunctionAccessToken,
} from '@/powersync/uploadHelpers';

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
          console.log(`[powersync] uploading transaction with ${transaction.crud.length} ops`);
          for (const op of transaction.crud) {
            const functionName = getUploadFunctionName(op.table, op.op, UpdateType.DELETE);
            if (op.op === UpdateType.DELETE && !functionName) {
              console.log(`[powersync] skipping DELETE on ${op.table} (${op.id})`);
              continue;
            }

            if (!functionName) {
              console.log(`[powersync] skipping unsupported table ${op.table} op ${op.op} id ${op.id}`);
              continue;
            }

            const localRow =
              op.table === 'products' && op.op !== UpdateType.DELETE
                ? await database.getOptional<Record<string, unknown>>('SELECT * FROM products WHERE id = ?', [op.id])
                : null;
            const payload = buildCrudUploadPayload(
              {
                table: op.table,
                id: op.id,
                opData: op.opData as Record<string, unknown> | null,
              },
              localRow,
            );

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
