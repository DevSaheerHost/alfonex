'use client';

import { useState, useEffect } from 'react';

function pad(n: number) { return String(n).padStart(2, '0'); }

function timeLeft(endsAt: number) {
  const diff = Math.max(0, endsAt - Date.now());
  const s = Math.floor(diff / 1000);
  return {
    h: Math.floor(s / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    expired: diff === 0,
  };
}

interface Props {
  endsAt: number;
  compact?: boolean; // true = one-line chip (for product cards)
}

export default function SaleCountdown({ endsAt, compact = false }: Props) {
  const [t, setT] = useState(() => timeLeft(endsAt));

  useEffect(() => {
    if (t.expired) return;
    const id = setInterval(() => setT(timeLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt, t.expired]);

  if (t.expired) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <i className="fa fa-clock text-[8px]" />
        {t.h > 0 ? `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}` : `${pad(t.m)}:${pad(t.s)}`}
      </span>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <i className="fa fa-clock text-red-500 text-sm" />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Sale ends in</span>
      <div className="flex items-center gap-1">
        {t.h > 0 && (
          <>
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">{pad(t.h)}</span>
            <span className="text-xs font-bold text-red-500">:</span>
          </>
        )}
        <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">{pad(t.m)}</span>
        <span className="text-xs font-bold text-red-500">:</span>
        <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">{pad(t.s)}</span>
      </div>
    </div>
  );
}
