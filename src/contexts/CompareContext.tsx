'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const MAX_COMPARE = 3;
const LS_KEY = 'alfonex_compare';

interface CompareCtx {
  ids:    string[];
  add:    (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  has:    (id: string) => boolean;
  clear:  () => void;
}

const Ctx = createContext<CompareCtx>({
  ids: [], add: () => {}, remove: () => {}, toggle: () => {}, has: () => false, clear: () => {},
});

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as string[];
      if (Array.isArray(saved)) setIds(saved.slice(0, MAX_COMPARE));
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }, []);

  const add    = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id) || prev.length >= MAX_COMPARE) return prev;
      const next = [...prev, id];
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => persist(ids.filter((x) => x !== id)), [ids, persist]);
  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id);
      } else if (prev.length < MAX_COMPARE) {
        next = [...prev, id];
      } else {
        return prev; // already at max
      }
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const has    = useCallback((id: string) => ids.includes(id), [ids]);
  const clear  = useCallback(() => persist([]), [persist]);

  return <Ctx.Provider value={{ ids, add, remove, toggle, has, clear }}>{children}</Ctx.Provider>;
}

export const useCompare = () => useContext(Ctx);
