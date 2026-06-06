import { create } from 'zustand';

import { powersync } from '@/powersync';
import type { Branch, Business, BusinessSummary } from '@/types/models';
import { useAuthStore } from './authStore';
import { buildFallbackBusinessFromSummary } from './businessSelectionHelpers';

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

    const branchId = available?.branchId;
    const branch =
      branchId !== null
        ? await powersync.getOptional<Branch>('SELECT * FROM branches WHERE id = ?', [branchId])
        : await powersync.getOptional<Branch>(
            'SELECT * FROM branches WHERE business_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1',
            [businessId],
          );

    useAuthStore.getState().setError(null);
    set({
      activeBusiness: business,
      activeBranch: branch,
    });
  },
  clearActiveBusiness: () => {
    set({
      activeBusiness: null,
      activeBranch: null,
    });
  },
}));
