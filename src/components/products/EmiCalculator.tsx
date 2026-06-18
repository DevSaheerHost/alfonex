'use client';

import { useState } from 'react';

interface Props {
  price: number;
  symbol: string;
}

const TENORS = [3, 6, 12, 18, 24] as const;

// Simple flat-rate EMI: interest is applied on original principal
function calcEmi(principal: number, months: number, annualRate: number) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function EmiCalculator({ price, symbol }: Props) {
  const [open,   setOpen]   = useState(false);
  const [months, setMonths] = useState<number>(6);
  const [rate,   setRate]   = useState<number>(0);

  const emi        = calcEmi(price, months, rate);
  const totalPay   = emi * months;
  const totalInt   = totalPay - price;

  return (
    <div className="card mb-4">
      <button
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold dark:text-gray-100">
          <i className="fa fa-calculator text-primary-500" />
          EMI Calculator
        </span>
        <i className={`fa fa-chevron-${open ? 'up' : 'down'} text-xs text-gray-400`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700">
          {/* Tenor selector */}
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Repayment period</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {TENORS.map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  months === m
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {m} months
              </button>
            ))}
          </div>

          {/* Interest rate input */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Annual interest rate (% · enter 0 for 0% finance)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={50}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Math.max(0, Math.min(50, Number(e.target.value))))}
                className="mf-input w-28 text-sm"
              />
              <span className="text-sm text-gray-400">% p.a.</span>
            </div>
          </div>

          {/* Result */}
          <div className="rounded-xl bg-primary-50 p-3 dark:bg-primary-900/20">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Monthly payment</span>
              <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {symbol}{emi.toFixed(2)}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Total payable</span>
              <span>{symbol}{totalPay.toFixed(2)}</span>
            </div>
            {totalInt > 0.01 && (
              <div className="mt-0.5 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Total interest</span>
                <span className="text-amber-600 dark:text-amber-400">+{symbol}{totalInt.toFixed(2)}</span>
              </div>
            )}
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
            Indicative only. Actual EMI depends on your bank or financing partner terms.
          </p>
        </div>
      )}
    </div>
  );
}
