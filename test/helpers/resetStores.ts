import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCartStore } from '@/store/cartStore';
import { useSyncStore } from '@/store/syncStore';
import { resetFactorySequence } from '../factories/models';

export function resetAllStores(): void {
  useAuthStore.setState({
    status: 'loading',
    userId: null,
    email: null,
    fullname: null,
    role: null,
    accessToken: null,
    error: null,
  });

  useBusinessStore.setState({
    activeBusiness: null,
    activeBranch: null,
    availableBusinesses: [],
  });

  useCartStore.setState({
    items: [],
    paymentMethod: 'cash',
    discountAmount: 0,
    note: '',
  });

  useSyncStore.setState({
    phase: 'booting',
    isOnline: true,
    remoteSyncConfigured: false,
    lastError: null,
    lastSyncedAt: null,
    pendingUploadCount: 0,
    session: {
      userId: null,
      businessId: null,
      branchId: null,
    },
  });

  resetFactorySequence();
}
