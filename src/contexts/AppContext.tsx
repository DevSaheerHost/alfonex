'use client';

import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import type { Currency } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppCtx {
  currency:    Currency;
  setCurrency: (c: Currency) => void;
  theme:       'light' | 'dark';
  toggleTheme: () => void;
  convRate:    number; // AED → INR live rate
}

const AppContext = createContext<AppCtx | null>(null);

// ─── Currency auto-detect ─────────────────────────────────────────────────────

async function detectCurrency(): Promise<Currency> {
  try {
    const res  = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    const data = await res.json();
    const code: string = data.country_code ?? '';
    const gccCodes = ['AE', 'SA', 'OM', 'BH', 'KW', 'QA'];
    if (code === 'IN') return 'inr';
    if (gccCodes.includes(code)) return 'aed';
  } catch {
    // fall through
  }
  return 'usd';
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const CURRENCY_KEY = 'ia_cur_manual';
const THEME_KEY    = 'ia_theme';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('usd');
  const [theme, setTheme]            = useState<'light' | 'dark'>('light');
  const [convRate, setConvRate]      = useState<number>(23);

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    const initial = saved ?? 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  // Currency init
  useEffect(() => {
    const manual = localStorage.getItem(CURRENCY_KEY) as Currency | null;
    if (manual) {
      setCurrencyState(manual);
    } else {
      detectCurrency().then(setCurrencyState);
    }
  }, []);

  // Live AED→INR rate
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/AED')
      .then((r) => r.json())
      .then((d) => {
        const rate = d?.rates?.INR;
        if (typeof rate === 'number' && rate > 0) setConvRate(rate);
      })
      .catch(() => {});
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(CURRENCY_KEY, c);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{ currency, setCurrency, theme, toggleTheme, convRate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Price helper (use in components) ────────────────────────────────────────

import type { Product } from '@/lib/types';

export function useProductPrice() {
  const { currency, convRate } = useApp();

  return function getProdPrice(p: Product): number {
    switch (currency) {
      case 'usd':
        return p.priceUSD ?? p.price;
      case 'aed':
        return p.priceAED ?? p.price;
      case 'inr':
        if (p.priceINR) return p.priceINR;
        if (p.priceAED) return Math.round(p.priceAED * convRate);
        return Math.round(p.price * convRate);
    }
  };
}
