'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth }   from '@/contexts/AuthContext';
import { upsertProfile } from '@/actions/users';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';

interface Props {
  initialProfile: UserProfile | null;
}

export default function ProfileClient({ initialProfile }: Props) {
  const { user, logout }  = useAuth();
  const router            = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error,   setError]   = useState('');

  const [name,     setName]     = useState(initialProfile?.name ?? user?.displayName ?? '');
  const [whatsapp, setWhatsapp] = useState(initialProfile?.whatsapp ?? '');

  const handleSave = () => {
    setError('');
    startTransition(async () => {
      try {
        await upsertProfile({ name: name.trim(), whatsapp: whatsapp.trim() });
        setEditing(false);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const handleCancel = () => {
    setName(initialProfile?.name ?? user?.displayName ?? '');
    setWhatsapp(initialProfile?.whatsapp ?? '');
    setError('');
    setEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="page-wrapper">
      <h1 className="mb-5 font-heading text-xl font-bold dark:text-gray-100">My Account</h1>

      {/* Profile card */}
      <div className="card mb-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xl text-primary-600 dark:bg-primary-900 dark:text-primary-300">
            <i className="fa fa-circle-user" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold dark:text-gray-100">{name || user?.displayName}</p>
            <p className="truncate text-sm text-gray-400">{user?.email}</p>
            {whatsapp && !editing && (
              <p className="mt-0.5 text-xs text-gray-400"><i className="fa-brands fa-whatsapp mr-1 text-green-500" />{whatsapp}</p>
            )}
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex-shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-800 dark:hover:text-primary-400"
              aria-label="Edit profile"
            >
              <i className="fa fa-pen text-sm" />
            </button>
          )}
        </div>

        {editing && (
          <div className="mt-4 animate-page-enter">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Full Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">WhatsApp Number</label>
                <input className="input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+91 …" />
              </div>
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button onClick={handleSave} disabled={isPending} className="btn-primary flex-1">
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={handleCancel} disabled={isPending} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="card mb-4 divide-y divide-gray-100 dark:divide-gray-800">
        {[
          { href: '/orders',    icon: 'fa-box',           label: 'My Orders' },
          { href: '/addresses', icon: 'fa-location-dot',  label: 'Saved Addresses' },
          { href: '/wishlist',  icon: 'fa-heart',         label: 'Wishlist' },
          { href: '/loyalty',   icon: 'fa-star',           label: 'Loyalty & Rewards' },
          { href: '/warranty',  icon: 'fa-shield-halved', label: 'Warranty Claims' },
          { href: '/converter', icon: 'fa-coins',          label: 'AED ↔ INR Converter' },
          { href: '/about',     icon: 'fa-circle-info',    label: 'About Alfonex' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3 text-sm dark:text-gray-200">
              <i className={`fa ${item.icon} w-4 text-gray-400`} />
              {item.label}
            </div>
            <i className="fa fa-chevron-right text-xs text-gray-400" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
      >
        <i className="fa fa-arrow-right-from-bracket mr-2" />
        Sign Out
      </button>
    </div>
  );
}
