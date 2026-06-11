'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';

export default function ConverterPage() {
  const { convRate } = useApp();
  const [aed, setAed] = useState('');
  const [inr, setInr] = useState('');

  // Sync convRate fallback on initial load
  useEffect(() => {
    if (aed !== '') {
      const val = parseFloat(aed);
      if (!isNaN(val)) setInr((val * convRate).toFixed(2));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convRate]);

  const handleAed = (raw: string) => {
    setAed(raw);
    const val = parseFloat(raw);
    setInr(isNaN(val) || raw === '' ? '' : (val * convRate).toFixed(2));
  };

  const handleInr = (raw: string) => {
    setInr(raw);
    const val = parseFloat(raw);
    setAed(isNaN(val) || raw === '' ? '' : (val / convRate).toFixed(2));
  };

  const swap = () => {
    setAed(inr);
    setInr(aed);
  };

  return (
    <div className="page-wrapper">
      <Link href="/" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" /> Back
      </Link>

      <h1 className="mb-1 font-heading text-xl font-bold dark:text-gray-100">AED ↔ INR Converter</h1>
      <p className="mb-6 text-xs text-gray-400">
        Live rate: 1 AED = {convRate.toFixed(4)} INR
      </p>

      <div className="card p-5">
        {/* AED input */}
        <div className="mb-3">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
            AED — UAE Dirham
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
              د.إ
            </span>
            <input
              className="input pl-10"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={aed}
              onChange={(e) => handleAed(e.target.value)}
            />
          </div>
        </div>

        {/* Swap button */}
        <div className="mb-3 flex justify-center">
          <button
            onClick={swap}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:bg-dark-surface dark:text-gray-400"
            aria-label="Swap values"
          >
            <i className="fa fa-arrow-right-arrow-left text-sm" />
          </button>
        </div>

        {/* INR input */}
        <div className="mb-5">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
            INR — Indian Rupee
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
              ₹
            </span>
            <input
              className="input pl-8"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={inr}
              onChange={(e) => handleInr(e.target.value)}
            />
          </div>
        </div>

        {/* Rate info */}
        <div className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
          <i className="fa fa-circle-info mr-1 text-primary-500" />
          Rate from{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">open.er-api.com</span>
          {' '}— updates on page load
        </div>
      </div>

      {/* Quick reference */}
      <div className="card mt-4 p-4">
        <p className="mb-3 text-sm font-semibold dark:text-gray-100">Quick Reference</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[100, 500, 1000, 5000].map((amount) => (
            <button
              key={amount}
              onClick={() => handleAed(String(amount))}
              className="flex justify-between rounded-xl border border-gray-100 p-3 text-left transition hover:border-primary-300 hover:bg-primary-50 dark:border-gray-800 dark:hover:bg-primary-950/30"
            >
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                {amount} AED
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                ₹{(amount * convRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
