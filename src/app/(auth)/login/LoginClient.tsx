'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { applyReferralCode } from '@/actions/loyalty';

type Tab = 'login' | 'register';

export default function LoginClient() {
  const [tab, setTab]            = useState<Tab>('login');
  const [error, setError]        = useState('');
  const [isPending, startTransition] = useTransition();
  const { login, register }      = useAuth();
  const searchParams             = useSearchParams();
  const redirectTo               = searchParams.get('redirect') ?? '/';
  const refCode                  = searchParams.get('ref') ?? '';

  // ── Login ──────────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = () => {
    setError('');
    startTransition(async () => {
      try {
        await login(loginEmail.trim(), loginPassword);
        window.location.replace(redirectTo);
      } catch (e: unknown) {
        setError(friendlyError(e));
      }
    });
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const [name,     setName]     = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone,    setPhone]    = useState('');
  const [pass,     setPass]     = useState('');
  const [pass2,    setPass2]    = useState('');

  const handleRegister = () => {
    setError('');
    if (pass !== pass2) { setError('Passwords do not match'); return; }
    if (pass.length < 6) { setError('Password must be at least 6 characters'); return; }

    startTransition(async () => {
      try {
        await register(name.trim(), regEmail.trim(), pass, phone.trim());
        if (refCode) await applyReferralCode(refCode).catch(() => {});
        window.location.replace(redirectTo);
      } catch (e: unknown) {
        setError(friendlyError(e));
      }
    });
  };

  return (
    <div className="page-wrapper flex min-h-[80vh] flex-col justify-center">
      <div className="card p-6">

        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image src="/assets/logo/light_nobg.png" alt="Alfonex" width={130} height={42} className="dark:hidden" />
          <Image src="/assets/logo/dark_nobg.png"  alt="Alfonex" width={130} height={42} className="hidden dark:block" />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition
                ${tab === t ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-surface dark:text-gray-100' : 'text-gray-500'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <div className="flex flex-col gap-3">
            <input className="input" type="email"    placeholder="Email address"
              value={loginEmail}    onChange={(e) => setLoginEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Password"
              value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            <button onClick={handleLogin} disabled={isPending} className="btn-primary mt-1">
              {isPending ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <div className="flex flex-col gap-3">
            <input className="input" type="text"     placeholder="Full name"
              value={name}     onChange={(e) => setName(e.target.value)} />
            <input className="input" type="email"    placeholder="Email address"
              value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            <input className="input" type="tel"      placeholder="WhatsApp number"
              value={phone}    onChange={(e) => setPhone(e.target.value)} />
            <input className="input" type="password" placeholder="Password (min 6 chars)"
              value={pass}     onChange={(e) => setPass(e.target.value)} />
            <input className="input" type="password" placeholder="Confirm password"
              value={pass2}    onChange={(e) => setPass2(e.target.value)} />
            <button onClick={handleRegister} disabled={isPending} className="btn-primary mt-1">
              {isPending ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'Invalid email or password.';
  if (msg.includes('email-already-in-use'))
    return 'An account with this email already exists.';
  if (msg.includes('Session creation failed'))
    return 'Login failed — server session error. Please contact support.';
  if (msg.includes('network-request-failed'))
    return 'Network error. Please check your connection.';
  return msg || 'Something went wrong. Please try again.';
}
