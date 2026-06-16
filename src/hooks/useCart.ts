import { useCallback, useMemo, useRef } from 'react';

import { db } from '@/db/powersync';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCartStore } from '@/store/cartStore';
import type { PaymentMethod, Sale, SaleItem } from '@/types/models';
import { generateUUID } from '@/utils/generateUUID';
import { logCompleteSaleDebug } from '@/utils/syncDebug';

export function useCart() {
  const checkoutInProgressRef = useRef(false);
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
    async (
      overridePaymentMethod?: PaymentMethod,
      splitPayments?: Array<{ method: PaymentMethod; amount_peso: number }>,
      checkoutTraceId?: string,
    ) => {
      if (checkoutInProgressRef.current) {
        logCompleteSaleDebug(checkoutTraceId, 'validation failed: checkout already in progress');
        throw new Error('CHECKOUT_IN_PROGRESS');
      }

      checkoutInProgressRef.current = true;

      try {
      logCompleteSaleDebug(checkoutTraceId, 'cart checkout started', {
        businessId,
        branchId,
        userId,
        itemCount: items.length,
        subtotal,
        discountAmount,
        total,
        overridePaymentMethod: overridePaymentMethod ?? null,
        splitPaymentCount: splitPayments?.length ?? 0,
      });

      if (!businessId) {
        logCompleteSaleDebug(checkoutTraceId, 'validation failed: missing business');
        throw new Error('Missing active business context.');
      }

      if (!branchId) {
        logCompleteSaleDebug(checkoutTraceId, 'validation failed: missing branch');
        throw new Error('Missing active branch context.');
      }

      if (!userId) {
        logCompleteSaleDebug(checkoutTraceId, 'validation failed: missing user');
        throw new Error('Missing signed-in user context.');
      }

      if (items.length === 0) {
        logCompleteSaleDebug(checkoutTraceId, 'validation failed: empty cart');
        throw new Error('Cart is empty.');
      }

      if (splitPayments && splitPayments.length > 0) {
        const splitTotal = splitPayments.reduce((sum, payment) => sum + payment.amount_peso, 0);
        if (Math.abs(splitTotal - total) > 0.01) {
          logCompleteSaleDebug(checkoutTraceId, 'validation failed: split payment total mismatch', {
            splitTotal,
            total,
          });
          throw new Error('PAYMENT_TOTAL_MISMATCH');
        }
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

      logCompleteSaleDebug(checkoutTraceId, 'sale rows prepared', {
        saleId,
        idempotencyKey: sale.idempotency_key,
        businessId: sale.business_id,
        branchId: sale.branch_id,
        employeeId: sale.employee_id,
        itemCount: saleItems.length,
        productIds: saleItems.map((item) => item.product_id),
        totalAmount: sale.total_amount,
        paymentMethod: sale.payment_method,
        splitPayments: splitPayments?.map((payment) => ({
          method: payment.method,
          amount_peso: payment.amount_peso,
        })) ?? null,
      });

      const committedSale = await db.writeTransaction(async (tx) =>
        tx.createSale({
          sale,
          items: saleItems,
          actorId: userId,
          payments: splitPayments,
          checkoutTraceId,
        }),
      );

      logCompleteSaleDebug(checkoutTraceId, 'local transaction committed', {
        saleId: committedSale.id,
        referenceNumber: committedSale.reference_number ?? null,
      });
      clearCart();
      logCompleteSaleDebug(checkoutTraceId, 'cart cleared', { saleId: committedSale.id });
      return committedSale.id;
      } finally {
        checkoutInProgressRef.current = false;
      }
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
