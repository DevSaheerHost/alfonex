'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const WL_KEY = 'ia_wishlist';

interface WishlistCtx {
  ids:    string[];
  toggle: (productId: string) => void;
  has:    (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistCtx | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(WL_KEY) ?? '[]'); } catch { return []; }
  });

  const toggle = useCallback((productId: string) => {
    setIds((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem(WL_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  return (
    <WishlistContext.Provider value={{ ids, toggle, has }}>
      {children}
    </WishlistContext.Provider>
  );
}

const WL_DEFAULT: WishlistCtx = {
  ids:    [],
  toggle: () => {},
  has:    () => false,
};

export function useWishlist(): WishlistCtx {
  return useContext(WishlistContext) ?? WL_DEFAULT;
}
