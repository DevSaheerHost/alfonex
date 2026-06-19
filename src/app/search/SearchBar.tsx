'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { clientAuth } from '@/lib/firebase/client';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getApp } from 'firebase/app';
import { scoreProducts } from '@/lib/search';
import type { Product } from '@/lib/types';

const POPULAR     = ['iPhone 15', 'MacBook Air', 'AirPods Pro', 'Apple Watch', 'iPad'];
const HISTORY_KEY = 'ia_search_history';

export default function SearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue]     = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef   = useRef<HTMLDivElement>(null);

  useEffect(() => { setValue(initialQuery); }, [initialQuery]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')); } catch { /* ignore */ }
    if (!initialQuery) inputRef.current?.focus();
  }, [initialQuery]);

  // Live product list (client) — used only for the autosuggest dropdown
  useEffect(() => {
    clientAuth();
    const db    = getDatabase(getApp());
    const unsub = onValue(ref(db, 'products'), (snap) => {
      if (!snap.exists()) { setProducts([]); return; }
      const val = snap.val() as Record<string, object>;
      setProducts(
        Object.entries(val)
          .map(([id, data]) => ({ id, ...data }) as Product)
          .filter((p) => !p.isHidden),
      );
    });
    return () => unsub();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!focused) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [focused]);

  const suggestions = useMemo(
    () => (value.trim() ? scoreProducts(products, value).slice(0, 6) : []),
    [products, value],
  );

  const saveHistory = (q: string) => {
    const t = q.trim();
    if (!t) return;
    const next = [t, ...history.filter((h) => h !== t)].slice(0, 8);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const submit = (q: string) => {
    const t = q.trim();
    if (!t) return;
    saveHistory(t);
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const showDropdown = focused && (suggestions.length > 0 || (!value.trim() && (history.length > 0 || true)));

  return (
    <div ref={boxRef} className="relative z-30 mb-4">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(value); }}
        className="relative"
      >
        <i className="fa fa-search absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
        <input
          ref={inputRef}
          className="input pl-10 pr-10"
          placeholder="Search for iPhone, MacBook, AirPods…"
          value={value}
          enterKeyHint="search"
          onFocus={() => setFocused(true)}
          onChange={(e) => setValue(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <i className="fa fa-xmark" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-dark-surface">
          {/* Live product suggestions */}
          {suggestions.length > 0 && (
            <ul>
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => { submit(p.title); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <i className="fa fa-magnifying-glass text-xs text-gray-400" />
                    <span className="truncate text-sm text-gray-700 dark:text-gray-200">{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* History + popular (only when input empty) */}
          {!value.trim() && (
            <div className="p-3">
              {history.length > 0 && (
                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Recent</p>
                    <button onClick={clearHistory} className="text-[11px] text-gray-400 hover:text-red-500">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((h) => (
                      <button
                        key={h}
                        onClick={() => submit(h)}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-300"
                      >
                        <i className="fa fa-clock-rotate-left mr-1 text-[10px]" />{h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Popular</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
