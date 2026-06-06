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
  buildFunctionInvokeOptions,
  buildUploadFailureMessage,
  describeFunctionError,
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
            if (op.op === UpdateType.DELETE) {
              console.log(`[powersync] skipping DELETE on ${op.table} (${op.id})`);
              continue;
            }

            const payload = { ...op.opData, id: op.id, table: op.table };
            const functionName =
              op.table === 'profiles'
                ? 'upsert-profile'
                : op.table === 'sales'
                  ? 'commit_sale'
                : op.table === 'refunds'
                  ? 'create_refund'
                  : op.table === 'inventory_adjustments'
                    ? 'apply_inventory_adjustment'
                    : op.table === 'products'
                      ? 'save_product'
                      : op.table === 'branches'
                        ? 'create-branch'
                        : op.table === 'business_members'
                          ? 'add-member'
              : op.table === 'businesses'
                ? 'create-business'
                : null;

            if (!functionName) {
              console.log(`[powersync] skipping unsupported table ${op.table} op ${op.op} id ${op.id}`);
              continue;
            }

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
