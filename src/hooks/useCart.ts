import { useCallback, useMemo } from 'react';

import { db } from '@/db/powersync';
import { getLocalDbState } from '@/db/localDb';
import { createSaleFromCart } from '@/db/queries/salesQueries';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCartStore } from '@/store/cartStore';
import type { PaymentMethod } from '@/types/models';

export function useCart() {
  const items = useCartStore((state) => state.items);
  const paymentMethod = useCartStore((state) => state.paymentMethod);
  const discountAmount = useCartStore((state) => state.discountAmount);
  const note = useCartStore((state) => state.note);
  const clearCart = useCartStore((state) => state.clearCart);
  const addItem = useCartStore((state) => state.addItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const setPaymentMethod = useCartStore((state) => state.setPaymentMethod);
  const setDiscountAmount = useCartStore((state) => state.setDiscountAmount);
  const setNote = useCartStore((state) => state.setNote);

  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const branchId = useBusinessStore((state) => state.activeBranch?.id ?? null);
  const userId = useAuthStore((state) => state.userId);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);
  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  const checkout = useCallback(
    async (overridePaymentMethod?: PaymentMethod) => {
      if (!businessId || !branchId || !userId) {
        throw new Error('Missing active business context.');
      }

      if (items.length === 0) {
        throw new Error('Cart is empty.');
      }

      const sale = await db.writeTransaction(async () => {
        return createSaleFromCart({
          state: getLocalDbState(),
          businessId,
          branchId,
          employeeId: userId,
          paymentMethod: overridePaymentMethod ?? paymentMethod,
          discountAmount,
          note,
          items: items.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.selling_price,
          })),
        });
      });

      clearCart();
      return sale.id;
    },
    [businessId, branchId, userId, items, paymentMethod, discountAmount, note, clearCart],
  );

  return {
    items,
    subtotal,
    total,
    paymentMethod,
    discountAmount,
    note,
    addItem,
    setQuantity,
    removeItem,
    setPaymentMethod,
    setDiscountAmount,
    setNote,
    checkout,
  };
}

