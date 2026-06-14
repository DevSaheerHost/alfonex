'use client';

import Image from 'next/image';
import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';

export default function LoginForm() {
  const [digits, setDigits]   = useState(['', '', '', '', '', '']);
  const [error,  setError]    = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, val: string) {
    const d = val.replace(/\D/, '');
    if (!d) return;
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError('');
    if (i < 5) inputs.current[i + 1]?.focus();
    if (next.every(Boolean)) submit(next.join(''));
  }

  function handleKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const next = [...digits];
      if (next[i]) {
        next[i] = '';
        setDigits(next);
      } else if (i > 0) {
        inputs.current[i - 1]?.focus();
      }
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...digits];
    for (let j = 0; j < pasted.length; j++) next[j] = pasted[j];
    setDigits(next);
    if (pasted.length === 6) submit(pasted);
    else inputs.current[pasted.length]?.focus();
  }

  async function submit(pin: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pin }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        window.location.replace('/admin');
      } else {
        setError(data.error ?? 'Wrong password');
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputs.current[0]?.focus(), 50);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-[#111] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-[#1a1a1a]">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/assets/logo/light_nobg.png"
            alt="Alfonex"
            width={130}
            height={42}
            className="dark:hidden"
          />
          <Image
            src="/assets/logo/dark_nobg.png"
            alt="Alfonex"
            width={130}
            height={42}
            className="hidden dark:block"
          />
        </div>

        <p className="mb-1 text-center font-heading text-xl font-bold text-gray-800 dark:text-gray-100">
          Admin Access
        </p>
        <p className="mb-6 text-center text-sm text-gray-400">
          Enter your 6-digit PIN to continue
        </p>

        {/* PIN inputs */}
        <div className="mb-4 flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="h-12 w-10 rounded-xl border border-gray-200 bg-gray-50 text-center text-lg font-bold text-gray-800 outline-none transition
                focus:border-primary-500 focus:ring-2 focus:ring-primary-200
                dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-primary-900"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 text-center text-sm font-semibold text-red-500">
            <i className="fa fa-circle-xmark mr-1" />{error}
          </p>
        )}

        {/* Submit */}
        <button
          disabled={loading || digits.some((d) => !d)}
          onClick={() => submit(digits.join(''))}
          className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition
            hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <i className="fa fa-spinner fa-spin" /> : 'Enter'}
        </button>
      </div>
    </div>
  );
}
