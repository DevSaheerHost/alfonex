'use client';

import React, {
  createContext, useContext, useEffect, useReducer, useCallback,
} from 'react';
import type { CartItem } from '@/lib/types';

// ─── State & Actions ──────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'HYDRATE';         items: CartItem[] }
  | { type: 'ADD';             item: CartItem }
  | { type: 'REMOVE';          id: string }
  | { type: 'SET_QTY';         id: string; qty: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { items: action.items };

    case 'ADD': {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, qty: i.qty + action.item.qty } : i,
          ),
        };
      }
      return { items: [...state.items, action.item] };
    }

    case 'REMOVE':
      return { items: state.items.filter((i) => i.id !== action.id) };

    case 'SET_QTY':
      if (action.qty < 1) {
        return { items: state.items.filter((i) => i.id !== action.id) };
      }
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, qty: action.qty } : i,
        ),
      };

    case 'CLEAR':
      return { items: [] };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CartCtx {
  items:       CartItem[];
  totalQty:    number;
  subtotal:    number;
  addToCart:   (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  setQty:      (id: string, qty: number) => void;
  clearCart:   () => void;
}

const CartContext = createContext<CartCtx | null>(null);

const STORAGE_KEY = 'ia_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: 'HYDRATE', items: JSON.parse(raw) });
    } catch {
      // corrupted data — ignore
    }
  }, []);

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const addToCart    = useCallback((item: CartItem) => dispatch({ type: 'ADD', item }), []);
  const removeFromCart = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), []);
  const setQty       = useCallback((id: string, qty: number) => dispatch({ type: 'SET_QTY', id, qty }), []);
  const clearCart    = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const totalQty = state.items.reduce((s, i) => s + i.qty, 0);
  const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{
      items: state.items, totalQty, subtotal,
      addToCart, removeFromCart, setQty, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
