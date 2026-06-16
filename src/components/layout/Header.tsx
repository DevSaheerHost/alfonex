'use client';

import Link  from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart }   from '@/contexts/CartContext';
import { useApp }    from '@/contexts/AppContext';
import { useAuth }   from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useState, useRef, useEffect }  from 'react';
import type { AppNotification } from '@/lib/types';

const CURRENCY_OPTIONS = [
  { value: 'usd', label: 'USD $' },
  { value: 'aed', label: 'AED' },
  { value: 'inr', label: 'INR ₹' },
] as const;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const NOTIF_ICONS: Record<AppNotification['type'], string> = {
  order_placed: 'fa-circle-check text-green-500',
  order_status: 'fa-truck text-blue-500',
  general:      'fa-bell text-primary-500',
};

export default function Header() {
  const { totalQty }           = useCart();
  const { currency, setCurrency, theme, toggleTheme } = useApp();
  const { user }               = useAuth();
  const { notifications, unreadCount, pushPermission, pushError, markRead, markAllRead, enablePush } = useNotifications();
  const router                 = useRouter();
  const [showCur,    setShowCur]    = useState(false);
  const [showNotif,  setShowNotif]  = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  const openNotif = () => {
    setShowNotif((v) => !v);
    setShowCur(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-dark-border dark:bg-dark-bg/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6">

        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src={theme === 'dark' ? '/assets/logo/dark_nobg.png' : '/assets/logo/light_nobg.png'}
            alt="Alfonex"
            width={110}
            height={36}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-1">

          {/* Currency picker */}
          <div className="relative">
            <button
              onClick={() => setShowCur((s) => !s)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {currency.toUpperCase()}
              <i className="fa fa-chevron-down text-[10px]" />
            </button>
            {showCur && (
              <div className="absolute right-0 top-full mt-1 min-w-[90px] rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-dark-surface">
                {CURRENCY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { setCurrency(o.value); setShowCur(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800
                      ${currency === o.value ? 'font-bold text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <Link
            href="/search"
            aria-label="Search"
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <i className="fa fa-search text-[15px]" />
          </Link>

          {/* Notification bell — only when logged in */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotif}
                aria-label="Notifications"
                className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <i className="fa fa-bell text-[15px]" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="fixed right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-dark-surface">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <p className="text-sm font-semibold dark:text-gray-100">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Enable push banner */}
                  {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                    <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                      {pushError ? (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-600 dark:bg-red-950/40 dark:text-red-400">
                          <i className="fa fa-triangle-exclamation mr-1" />
                          {pushError}
                        </p>
                      ) : pushPermission === 'denied' ? (
                        <p className="text-[11px] text-gray-400">
                          Push blocked in browser settings.
                        </p>
                      ) : (
                        <button
                          onClick={async () => {
                            setEnablingPush(true);
                            await enablePush();
                            setEnablingPush(false);
                          }}
                          disabled={enablingPush}
                          className="flex w-full items-center gap-2 rounded-xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 disabled:opacity-50 dark:bg-primary-950/40 dark:text-primary-300"
                        >
                          <i className={`fa ${enablingPush ? 'fa-spinner fa-spin' : 'fa-bell-slash'} text-sm`} />
                          {enablingPush ? 'Enabling…' : 'Enable push notifications'}
                          {!enablingPush && <i className="fa fa-chevron-right ml-auto text-[10px]" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">
                        <i className="fa fa-bell-slash mb-2 block text-2xl" />
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            markRead(n.id);
                            setShowNotif(false);
                            if (n.orderId) router.push(`/orders/${n.orderId}`);
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800
                            ${!n.read ? 'bg-primary-50/60 dark:bg-primary-950/20' : ''}`}
                        >
                          <i className={`fa ${NOTIF_ICONS[n.type] ?? 'fa-bell text-gray-400'} mt-0.5 text-base`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${!n.read ? 'font-semibold' : 'font-medium'} dark:text-gray-100`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{n.body}</p>
                            <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.read && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <i className="fa fa-shopping-bag text-[15px]" />
            {totalQty > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                {totalQty > 9 ? '9+' : totalQty}
              </span>
            )}
          </Link>

          {/* User / Login */}
          <Link
            href={user ? '/profile' : '/login'}
            aria-label={user ? 'Profile' : 'Login'}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <i className={`fa ${user ? 'fa-circle-user' : 'fa-user'} text-[15px]`} />
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[15px]`} />
          </button>
        </div>
      </div>
    </header>
  );
}
