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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [name,     setName]     = useState(initialProfile?.name ?? user?.displayName ?? '');
  const [whatsapp, setWhatsapp] = useState(initialProfile?.whatsapp ?? '');

  const handleSave = () => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      try {
        await upsertProfile({ name: name.trim(), whatsapp: whatsapp.trim() });
        setSaved(true);
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
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
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-2xl text-primary-600 dark:bg-primary-900 dark:text-primary-300">
            <i className="fa fa-circle-user" />
          </div>
          <div>
            <p className="font-semibold dark:text-gray-100">{user?.displayName ?? name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Full Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">WhatsApp Number</label>
            <input className="input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
        </div>

        {error  && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {saved  && <p className="mt-2 text-xs text-green-600">Profile saved!</p>}

        <button onClick={handleSave} disabled={isPending} className="btn-primary mt-4 w-full">
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Quick links */}
      <div className="card mb-4 divide-y divide-gray-100 dark:divide-gray-800">
        {[
          { href: '/orders',    icon: 'fa-box',           label: 'My Orders' },
          { href: '/addresses', icon: 'fa-location-dot',  label: 'Saved Addresses' },
          { href: '/wishlist',  icon: 'fa-heart',         label: 'Wishlist' },
          { href: '/warranty',  icon: 'fa-shield-halved', label: 'Warranty Claims' },
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
