import { useCallback, useMemo } from 'react';

import { db } from '@/db/powersync';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCartStore } from '@/store/cartStore';
import type { PaymentMethod, Sale, SaleItem } from '@/types/models';
import { generateUUID } from '@/utils/generateUUID';

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
    async (overridePaymentMethod?: PaymentMethod, splitPayments?: Array<{ method: PaymentMethod; amount_peso: number }>) => {
      if (!businessId || !branchId || !userId) {
        throw new Error('Missing active business context.');
      }

      if (items.length === 0) {
        throw new Error('Cart is empty.');
      }

      const saleId = generateUUID();
      const saleItems: SaleItem[] = items.map((item) => ({
        id: generateUUID(),
        sale_id: saleId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        subtotal: item.subtotal,
      }));

      const sale: Sale = {
        id: saleId,
        business_id: businessId,
        branch_id: branchId,
        employee_id: userId,
        total_amount: total,
        discount_amount: discountAmount,
        payment_method: overridePaymentMethod ?? paymentMethod,
        status: 'completed',
        notes: note.trim() ? note : null,
        created_at: new Date().toISOString(),
        synced_at: null,
        reference_number: null,
        vat_amount: undefined,
        idempotency_key: generateUUID(),
        payments: undefined,
      };

      const committedSale = await db.writeTransaction(async (tx) =>
        tx.createSale({
          sale,
          items: saleItems,
          actorId: userId,
          payments: splitPayments,
        }),
      );

      clearCart();
      return committedSale.id;
    },
    [branchId, businessId, clearCart, discountAmount, items, note, paymentMethod, total, userId],
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
