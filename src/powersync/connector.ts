import {
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  UpdateType,
  type AbstractPowerSyncDatabase,
} from '@powersync/react-native';

import { offlineConfig } from '@/config/offline';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/store/authStore';

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
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      await transaction.complete();
      return;
    }

    try {
      for (const op of transaction.crud) {
        const payload = { ...op.opData, id: op.id, table: op.table };
        const functionName =
          op.table === 'profiles'
            ? 'upsert_profile'
            : op.table === 'sales'
              ? 'commit_sale'
            : op.table === 'refunds'
              ? 'create_refund'
              : op.table === 'inventory_adjustments'
                ? 'apply_inventory_adjustment'
                : op.table === 'products'
                  ? 'save_product'
                  : op.table === 'branches'
                    ? 'create_branch'
                    : op.table === 'business_members'
                      ? 'add_member'
                      : op.table === 'businesses'
                        ? 'create_business'
                        : null;

        if (!functionName) {
          continue;
        }

        const { error } = await client.functions.invoke(functionName, {
          body: {
            op: op.op,
            payload,
          },
        });
        if (error) {
          throw error;
        }

        if (op.op === UpdateType.DELETE) {
          continue;
        }
      }

      await transaction.complete();
    } catch (error) {
      throw error instanceof Error ? error : new Error('PowerSync upload failed');
    }
  }
}
