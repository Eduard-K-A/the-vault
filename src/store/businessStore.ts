import { create } from 'zustand';

import type { Branch, Business, BusinessSummary } from '@/types/models';
import { getLocalDbState } from '@/db/localDb';
import { useAuthStore } from './authStore';

interface BusinessState {
  activeBusiness: Business | null;
  activeBranch: Branch | null;
  availableBusinesses: BusinessSummary[];
  setAvailableBusinesses: (businesses: BusinessSummary[]) => void;
  selectBusiness: (businessId: string) => void;
  clearActiveBusiness: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  activeBusiness: null,
  activeBranch: null,
  availableBusinesses: [],
  setAvailableBusinesses: (businesses) => {
    set({ availableBusinesses: businesses });
  },
  selectBusiness: (businessId) => {
    const state = getLocalDbState();
    const business = state.businesses.find((entry) => entry.id === businessId) ?? null;
    if (!business) {
      return;
    }

    const available = get().availableBusinesses.find((entry) => entry.businessId === businessId) ?? null;
    const branchId = available?.branchId;
    const branch =
      branchId !== null
        ? state.branches.find((entry) => entry.id === branchId) ?? null
        : state.branches.find((entry) => entry.business_id === businessId && entry.is_active) ?? null;

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

