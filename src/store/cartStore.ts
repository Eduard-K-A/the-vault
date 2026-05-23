import { create } from 'zustand';

import type { CartItem, PaymentMethod, Product } from '@/types/models';

interface CartState {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  discountAmount: number;
  note: string;
  addItem: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setPaymentMethod: (paymentMethod: PaymentMethod) => void;
  setDiscountAmount: (discountAmount: number) => void;
  setNote: (note: string) => void;
}

function toCartItem(product: Product, quantity: number): CartItem {
  const safeQuantity = Math.max(1, quantity);
  const subtotal = safeQuantity * product.selling_price;

  return {
    product_id: product.id,
    name: product.name,
    barcode: product.barcode,
    sku: product.sku,
    quantity: safeQuantity,
    selling_price: product.selling_price,
    subtotal,
    image_url: product.image_url,
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  paymentMethod: 'cash',
  discountAmount: 0,
  note: '',
  addItem: (product, quantity = 1) => {
    const existing = get().items.find((item) => item.product_id === product.id);
    if (!existing) {
      set({ items: [...get().items, toCartItem(product, quantity)] });
      return;
    }

    set({
      items: get().items.map((item) => {
        if (item.product_id !== product.id) {
          return item;
        }

        const nextQuantity = item.quantity + Math.max(1, quantity);
        return toCartItem(product, nextQuantity);
      }),
    });
  },
  setQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((item) => item.product_id !== productId) });
      return;
    }

    set({
      items: get().items.map((item) => {
        if (item.product_id !== productId) {
          return item;
        }

        return {
          ...item,
          quantity,
          subtotal: quantity * item.selling_price,
        };
      }),
    });
  },
  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.product_id !== productId) });
  },
  clearCart: () => {
    set({
      items: [],
      paymentMethod: 'cash',
      discountAmount: 0,
      note: '',
    });
  },
  setPaymentMethod: (paymentMethod) => {
    set({ paymentMethod });
  },
  setDiscountAmount: (discountAmount) => {
    set({ discountAmount: Math.max(0, discountAmount) });
  },
  setNote: (note) => {
    set({ note });
  },
}));

