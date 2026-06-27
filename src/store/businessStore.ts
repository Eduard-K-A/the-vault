import { create } from 'zustand';

import { powersync } from '@/powersync';
import { refreshBusinessDataFromDatabase } from '@/services/businessDataRefresh.service';
import { syncPowerSyncNow } from '@/services/powersync.service';
import { useSyncStore } from '@/store/syncStore';
import type { Branch, Business, BusinessSummary } from '@/types/models';
import { useAuthStore } from './authStore';
import { enterSelectedBusiness } from './businessEntrySync';
import {
  buildFallbackBranchFromSummary,
  buildFallbackBusinessFromSummary,
  resolveSelectableBranch,
} from './businessSelectionHelpers';

interface BusinessState {
  activeBusiness: Business | null;
  activeBranch: Branch | null;
  availableBusinesses: BusinessSummary[];
  setAvailableBusinesses: (businesses: BusinessSummary[]) => void;
  selectBusiness: (businessId: string, joinedSummary?: BusinessSummary) => Promise<void>;
  clearActiveBusiness: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  activeBusiness: null,
  activeBranch: null,
  availableBusinesses: [],
  setAvailableBusinesses: (businesses) => {
    set({ availableBusinesses: businesses });
  },
  selectBusiness: async (businessId, joinedSummary) => {
    const suppliedSummary = joinedSummary?.businessId === businessId ? joinedSummary : null;
    const available =
      get().availableBusinesses.find((entry) => entry.businessId === businessId) ?? suppliedSummary;
    const business =
      (await powersync.getOptional<Business>('SELECT * FROM businesses WHERE id = ?', [businessId])) ??
      (available ? buildFallbackBusinessFromSummary(available) : null);
    if (!business || !available) {
      return;
    }

    if (suppliedSummary) {
      set({
        activeBusiness: business,
        activeBranch: buildFallbackBranchFromSummary(available),
      });
    }

    console.log(`[business] selecting business: ${business.name} (ID: ${business.id})`);

    const userId = useAuthStore.getState().userId;
    let enteredBusiness = false;
    const enterBusiness = async (selectedBranchId: string | null) => {
      enteredBusiness = true;
      await enterSelectedBusiness(
        {
          userId,
          businessId: business.id,
          branchId: selectedBranchId,
        },
        {
          setSyncSession: useSyncStore.getState().setSession,
          syncNow: syncPowerSyncNow,
          hydrateBusinessData: async (selectedBusinessId) => {
            await refreshBusinessDataFromDatabase(selectedBusinessId);
          },
          setLastError: useSyncStore.getState().setLastError,
        },
      );
    };

    const branch = await resolveSelectableBranch(
      available,
      (sql, params) => powersync.getOptional<Branch>(sql, params),
      async () => {
        useAuthStore.getState().setError(null);
        console.log(`[business] hydrating database rows for business ${business.id}`);
        await enterBusiness(null);
      },
    );

    if (branch) {
      console.log(`[business] selected branch: ${branch.name} (ID: ${branch.id})`);
    }

    useAuthStore.getState().setError(null);
    if (!enteredBusiness) {
      console.log(`[business] hydrating database rows for business ${business.id}`);
      await enterBusiness(branch?.id ?? null);
    } else if (branch) {
      useSyncStore.getState().setSession({
        userId,
        businessId: business.id,
        branchId: branch.id,
      });
    }

    const hydratedBusiness =
      (await powersync.getOptional<Business>('SELECT * FROM businesses WHERE id = ?', [businessId])) ?? business;
    const hydratedBranch =
      branch?.id
        ? ((await powersync.getOptional<Branch>('SELECT * FROM branches WHERE id = ?', [branch.id])) ?? branch)
        : branch;

    console.log(`[business] entering business ${hydratedBusiness.id}`);
    set({
      activeBusiness: hydratedBusiness,
      activeBranch: hydratedBranch,
    });
  },
  clearActiveBusiness: () => {
    set({
      activeBusiness: null,
      activeBranch: null,
    });
  },
}));
