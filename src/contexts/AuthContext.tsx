'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';

interface AuthCtx {
  user:     User | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout:   () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = clientAuth();
    return onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      setLoading(false);
    });
  }, []);

  // Exchange the Firebase ID token for a secure HttpOnly session cookie
  const createSession = useCallback(async (fbUser: User) => {
    const idToken = await fbUser.getIdToken();
    await fetch('/api/auth/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idToken }),
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: fbUser } = await signInWithEmailAndPassword(
      clientAuth(), email, password,
    );
    await createSession(fbUser);
  }, [createSession]);

  const register = useCallback(async (
    name: string, email: string, password: string, phone: string,
  ) => {
    const { user: fbUser } = await createUserWithEmailAndPassword(
      clientAuth(), email, password,
    );
    await updateProfile(fbUser, { displayName: name });

    // Persist extra fields to Firestore via an API route (avoids Server Action
    // dependency in this client-side context)
    await fetch('/api/auth/register-profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, phone, uid: fbUser.uid }),
    });

    await createSession(fbUser);
  }, [createSession]);

  const logout = useCallback(async () => {
    await signOut(clientAuth());
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
