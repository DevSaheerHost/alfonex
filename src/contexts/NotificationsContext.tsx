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
  markRead:       (id: string) => void;
  markAllRead:    () => void;
  enablePush:     () => Promise<void>;
}

const NotifContext = createContext<NotifCtx>({
  notifications: [],
  unreadCount: 0,
  pushPermission: 'default',
  markRead: () => {},
  markAllRead: () => {},
  enablePush: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications,  setNotifications]  = useState<AppNotification[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');

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

  // Handle foreground FCM messages (app is open — update bell via RTDB listener above)
  useEffect(() => {
    if (!user || pushPermission !== 'granted') return;
    let cancel: (() => void) | undefined;
    import('@/lib/firebase/messaging').then(({ subscribeForeground }) => {
      cancel = subscribeForeground(() => {
        // RTDB onValue already updates the bell; nothing extra needed here
      });
    });
    return () => cancel?.();
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
    const { requestPushToken } = await import('@/lib/firebase/messaging');
    const token = await requestPushToken();
    if (!token) {
      setPushPermission(Notification.permission as NotificationPermission);
      return;
    }
    setPushPermission('granted');
    // Store token in RTDB so server can send pushes
    const db = getDatabase(getApp());
    await update(ref(db, `users/${user.uid}`), { fcmToken: token });
  }, [user]);

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount, pushPermission,
      markRead, markAllRead, enablePush,
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications(): NotifCtx {
  return useContext(NotifContext);
}
