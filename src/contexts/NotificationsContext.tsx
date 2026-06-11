'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getApp } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppNotification } from '@/lib/types';

interface NotifCtx {
  notifications: AppNotification[];
  unreadCount:   number;
  markRead:      (id: string) => void;
  markAllRead:   () => void;
}

const NotifContext = createContext<NotifCtx>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    const db      = getDatabase(getApp());
    const notifRef = ref(db, `notifications/${user.uid}`);
    const unsub   = onValue(notifRef, (snap) => {
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

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications(): NotifCtx {
  return useContext(NotifContext);
}
