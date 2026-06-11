'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import ProductCard from '@/components/products/ProductCard';
import { clientAuth } from '@/lib/firebase/client';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getApp } from 'firebase/app';
import type { Product } from '@/lib/types';

const POPULAR = ['iPhone 15', 'MacBook Air', 'AirPods Pro', 'Apple Watch', 'iPad'];
const HISTORY_KEY = 'ia_search_history';

function normalizeQuery(raw: string): string {
  let q = raw.toLowerCase().trim();

  // Expand Apple shorthands — order matters (more specific first)
  const aliases: [RegExp, string][] = [
    [/\biphone\s*(\d)/g,  'iphone $1'],   // iphone15 → iphone 15
    [/\bios\s*(\d+)/g,    'iphone $1'],   // ios15    → iphone 15
    [/\bip\s*(\d)/g,      'iphone $1'],   // ip15, ip 15 → iphone 15
    [/\bip\b/g,           'iphone'],      // standalone ip → iphone
    [/\bmbp\b/g,          'macbook pro'],
    [/\bmba\b/g,          'macbook air'],
    [/\bmb\b/g,           'macbook'],
    [/\bap\b/g,           'airpods'],
    [/\baw\b/g,           'apple watch'],
    [/\bipad\s*(\d)/g,    'ipad $1'],     // ipad10 → ipad 10
  ];

  for (const [pattern, replacement] of aliases) {
    q = q.replace(pattern, replacement);
  }

  // Separate any remaining letter-digit runs: "watch8" → "watch 8"
  q = q.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');

  return q.trim();
}

function searchProducts(products: Product[], raw: string): Product[] {
  if (!raw.trim()) return [];
  const tokens = normalizeQuery(raw).split(/\s+/).filter((t) => t.length > 0);
  if (!tokens.length) return [];

  const scored: { p: Product; score: number }[] = [];

  for (const p of products) {
    const title = p.title.toLowerCase();
    const hay   = `${title} ${p.description ?? ''} ${p.category ?? ''}`.toLowerCase();
    if (!tokens.every((t) => hay.includes(t))) continue;
    // Matches in title rank higher than description/category matches
    const score = tokens.reduce((acc, t) => acc + (title.includes(t) ? 2 : 1), 0);
    scored.push({ p, score });
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts]       = useState<Product[]>([]);
  const inputRef                      = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
  });

  // Real-time Realtime Database subscription
  useEffect(() => {
    // Ensure Firebase app is initialised (clientAuth() triggers it)
    clientAuth();
    const db     = getDatabase(getApp());
    const dbRef  = ref(db, 'products');
    const unsub  = onValue(dbRef, (snap) => {
      if (!snap.exists()) { setProducts([]); return; }
      const val = snap.val() as Record<string, object>;
      const list = Object.entries(val)
        .map(([id, data]) => ({ id, ...data }) as Product)
        .filter((p) => !p.isHidden);
      setProducts(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => searchProducts(products, searchQuery), [products, searchQuery]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim() && !history.includes(q.trim())) {
      const next = [q.trim(), ...history].slice(0, 8);
      setHistory(next);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    }
  };

  return (
    <div className="page-wrapper">
      <div className="relative mb-4">
        <i className="fa fa-search absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
        <input
          ref={inputRef}
          className="input pl-10 pr-10"
          placeholder="Search products…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <i className="fa fa-xmark" />
          </button>
        )}
      </div>

      {!searchQuery && (
        <>
          {history.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent</p>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <button key={h} onClick={() => setSearchQuery(h)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-300">
                    <i className="fa fa-clock-rotate-left mr-1 text-[10px]" />{h}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Popular</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((s) => (
                <button key={s} onClick={() => handleSearch(s)}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-surface dark:text-gray-300">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {searchQuery && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <i className="fa fa-magnifying-glass text-3xl" />
          <p className="text-sm">No results for &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="mb-3 text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 gap-3">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
