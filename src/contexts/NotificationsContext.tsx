'use client';

import {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getApp } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppNotification } from '@/lib/types';

interface NotifCtx {
  notifications:  AppNotification[];
  unreadCount:    number;
  pushPermission: NotificationPermission | 'unsupported';
  pushError:      string;
  markRead:       (id: string) => void;
  markAllRead:    () => void;
  enablePush:     () => Promise<void>;
}

interface ForegroundToast {
  title: string;
  body:  string;
}

const NotifContext = createContext<NotifCtx>({
  notifications: [],
  unreadCount: 0,
  pushPermission: 'default',
  pushError: '',
  markRead: () => {},
  markAllRead: () => {},
  enablePush: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications,    setNotifications]    = useState<AppNotification[]>([]);
  const [pushPermission,   setPushPermission]   = useState<NotificationPermission | 'unsupported'>('default');
  const [pushError,        setPushError]        = useState('');
  const [foregroundToast,  setForegroundToast]  = useState<ForegroundToast | null>(null);

  // Read initial permission state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setPushPermission('unsupported');
      return;
    }
    setPushPermission(Notification.permission);
  }, []);

  // Real-time RTDB bell
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    const db       = getDatabase(getApp());
    const notifRef = ref(db, `notifications/${user.uid}`);
    const unsub    = onValue(notifRef, (snap) => {
      if (!snap.exists()) { setNotifications([]); return; }
      const list: AppNotification[] = Object.entries(
        snap.val() as Record<string, Omit<AppNotification, 'id'>>,
      )
        .map(([id, data]) => ({ id, ...data } as AppNotification))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 30);
      setNotifications(list);
    });
    return unsub;
  }, [user]);

  // Handle foreground FCM messages — show toast and update bell via RTDB listener
  useEffect(() => {
    if (!user || pushPermission !== 'granted') return;
    let cancel: (() => void) | undefined;
    let toastTimer: ReturnType<typeof setTimeout>;
    import('@/lib/firebase/messaging').then(({ subscribeForeground }) => {
      cancel = subscribeForeground((payload) => {
        const title = payload.notification?.title ?? 'Alfonex';
        const body  = payload.notification?.body  ?? '';
        setForegroundToast({ title, body });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setForegroundToast(null), 4500);
      });
    });
    return () => { cancel?.(); clearTimeout(toastTimer); };
  }, [user, pushPermission]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    if (!user) return;
    const db = getDatabase(getApp());
    update(ref(db, `notifications/${user.uid}/${id}`), { read: true });
  }, [user]);

  const markAllRead = useCallback(() => {
    if (!user) return;
    const db = getDatabase(getApp());
    notifications
      .filter((n) => !n.read)
      .forEach((n) => update(ref(db, `notifications/${user.uid}/${n.id}`), { read: true }));
  }, [user, notifications]);

  const enablePush = useCallback(async () => {
    if (!user) return;
    setPushError('');
    const { requestPushToken } = await import('@/lib/firebase/messaging');
    const result = await requestPushToken();
    if (!result.ok) {
      setPushError(result.message);
      if ('Notification' in window) setPushPermission(Notification.permission as NotificationPermission);
      return;
    }
    setPushPermission('granted');
    const db = getDatabase(getApp());
    await update(ref(db, `users/${user.uid}`), { fcmToken: result.token });
  }, [user]);

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount, pushPermission, pushError,
      markRead, markAllRead, enablePush,
    }}>
      {children}

      {/* Foreground FCM toast — visible on any page when app is open */}
      {foregroundToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '76px',
            left: '50%',
            zIndex: 9999,
            maxWidth: '340px',
            width: 'calc(100% - 32px)',
          }}
          className="flex animate-slide-up items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-2xl dark:border-gray-700 dark:bg-dark-surface"
        >
          <i className="fa fa-bell mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
              {foregroundToast.title}
            </p>
            {foregroundToast.body && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {foregroundToast.body}
              </p>
            )}
          </div>
          <button
            onClick={() => setForegroundToast(null)}
            className="ml-1 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Dismiss"
          >
            <i className="fa fa-xmark text-xs" />
          </button>
        </div>
      )}
    </NotifContext.Provider>
  );
}

export function useNotifications(): NotifCtx {
  return useContext(NotifContext);
}
