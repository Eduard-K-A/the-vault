import { usePowerSyncQuery } from '@/db/powersync';
import { getLocalDbState } from '@/db/localDb';
import { getEmployeeAnalytics, getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';

export function useAnalytics() {
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.userId);
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);

  const { data } = usePowerSyncQuery('SELECT analytics', [role, userId, businessId, branchId], {
    selector: (state) => {
      if (role === 'owner' && businessId && branchId) {
        return getOwnerAnalytics(state, businessId, branchId);
      }

      if (role === 'employee' && userId) {
        return getEmployeeAnalytics(state, userId);
      }

      return null;
    },
  });

  return {
    analytics: data,
    getState: getLocalDbState,
  };
}

