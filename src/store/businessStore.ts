import { create } from 'zustand';

import { powersync } from '@/powersync';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { useSyncStore } from '@/store/syncStore';
import type { Branch, Business, BusinessSummary } from '@/types/models';
import { useAuthStore } from './authStore';
import { enterSelectedBusiness } from './businessEntrySync';
import { buildFallbackBranchFromSummary, buildFallbackBusinessFromSummary } from './businessSelectionHelpers';

interface BusinessState {
  activeBusiness: Business | null;
  activeBranch: Branch | null;
  availableBusinesses: BusinessSummary[];
  setAvailableBusinesses: (businesses: BusinessSummary[]) => void;
  selectBusiness: (businessId: string) => Promise<void>;
  clearActiveBusiness: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  activeBusiness: null,
  activeBranch: null,
  availableBusinesses: [],
  setAvailableBusinesses: (businesses) => {
    set({ availableBusinesses: businesses });
  },
  selectBusiness: async (businessId) => {
    const available = get().availableBusinesses.find((entry) => entry.businessId === businessId) ?? null;
    const business =
      (await powersync.getOptional<Business>('SELECT * FROM businesses WHERE id = ?', [businessId])) ??
      (available ? buildFallbackBusinessFromSummary(available) : null);
    if (!business || !available) {
      return;
    }

    console.log(`[business] selecting business: ${business.name} (ID: ${business.id})`);

    const branchId = available?.branchId;
    const branch =
      (branchId !== null
        ? await powersync.getOptional<Branch>('SELECT * FROM branches WHERE id = ?', [branchId])
        : await powersync.getOptional<Branch>(
            'SELECT * FROM branches WHERE business_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1',
            [businessId],
          )) ?? buildFallbackBranchFromSummary(available);

    if (branch) {
      console.log(`[business] selected branch: ${branch.name} (ID: ${branch.id})`);
    }

    useAuthStore.getState().setError(null);
    set({
      activeBusiness: business,
      activeBranch: branch,
    });

    console.log(`[business] initiating sync for business ${business.id}`);
    await enterSelectedBusiness(
      {
        userId: useAuthStore.getState().userId,
        businessId: business.id,
        branchId: branch?.id ?? null,
      },
      {
        setSyncSession: useSyncStore.getState().setSession,
        syncNow: syncPowerSyncNow,
        setLastError: useSyncStore.getState().setLastError,
      },
    );
  },
  clearActiveBusiness: () => {
    set({
      activeBusiness: null,
      activeBranch: null,
    });
  },
}));
