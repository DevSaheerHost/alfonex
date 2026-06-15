'use client';

import Image from 'next/image';
import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

type PcType = 'digit4' | 'digit6' | 'alphanumeric';

const SUBTITLE: Record<PcType, string> = {
  digit4:       'Enter your 4-digit PIN to continue',
  digit6:       'Enter your 6-digit PIN to continue',
  alphanumeric: 'Enter your passcode to continue',
};

export default function LoginForm() {
  const [pcType,   setPcType]   = useState<PcType>('digit6');
  const [digits,   setDigits]   = useState<string[]>(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const pwRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin-auth')
      .then((r) => r.json())
      .then((d: { type?: PcType }) => {
        const t = d.type ?? 'digit6';
        setPcType(t);
        const len = t === 'digit4' ? 4 : 6;
        setDigits(Array(len).fill(''));
      })
      .catch(() => {});
  }, []);

  // ── digit box handlers ──────────────────────────────────────────────────────
  function handleChange(i: number, val: string) {
    const d = val.replace(/\D/, '');
    if (!d) return;
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError('');
    if (i < digits.length - 1) inputs.current[i + 1]?.focus();
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
    const max    = digits.length;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, max);
    const next   = [...digits];
    for (let j = 0; j < pasted.length; j++) next[j] = pasted[j];
    setDigits(next);
    if (pasted.length === max) submit(pasted);
    else inputs.current[pasted.length]?.focus();
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  async function submit(passcode: string) {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/admin-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ passcode }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        window.location.replace('/admin');
      } else {
        setError(data.error ?? 'Wrong passcode');
        if (pcType !== 'alphanumeric') {
          setDigits(Array(digits.length).fill(''));
          setTimeout(() => inputs.current[0]?.focus(), 50);
        } else {
          setPassword('');
          setTimeout(() => pwRef.current?.focus(), 50);
        }
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  const isDigit = pcType === 'digit4' || pcType === 'digit6';
  const canSubmit = isDigit ? digits.every(Boolean) : password.length >= 1;

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
          {SUBTITLE[pcType]}
        </p>

        {/* Digit boxes */}
        {isDigit && (
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
        )}

        {/* Alphanumeric password field */}
        {!isDigit && (
          <div className="mb-4 flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:ring-primary-900">
            <input
              ref={pwRef}
              type={showPw ? 'text' : 'password'}
              autoFocus
              autoComplete="current-password"
              placeholder="Passcode"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && password) submit(password); }}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none dark:text-gray-100"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <i className={`fa ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mb-3 text-center text-sm font-semibold text-red-500">
            <i className="fa fa-circle-xmark mr-1" />{error}
          </p>
        )}

        {/* Submit */}
        <button
          disabled={loading || !canSubmit}
          onClick={() => submit(isDigit ? digits.join('') : password)}
          className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition
            hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <i className="fa fa-spinner fa-spin" /> : 'Enter'}
        </button>
      </div>
    </div>
  );
}
