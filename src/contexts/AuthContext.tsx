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
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';

interface AuthCtx {
  user:          User | null;
  loading:       boolean;
  login:         (email: string, password: string) => Promise<void>;
  register:      (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout:        () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const auth = clientAuth();
      // onAuthStateChanged 3rd arg is an error handler — catches invalid-api-key etc.
      return onAuthStateChanged(
        auth,
        (fbUser) => { setUser(fbUser); setLoading(false); },
        ()       => { setLoading(false); },
      );
    } catch {
      setLoading(false);
    }
  }, []);

  // Exchange the Firebase ID token for a secure HttpOnly session cookie
  const createSession = useCallback(async (fbUser: User) => {
    const idToken = await fbUser.getIdToken();
    const res = await fetch('/api/auth/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error('Session creation failed — check Firebase Admin config');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: fbUser } = await signInWithEmailAndPassword(
      clientAuth(), email, password,
    );
    await createSession(fbUser);
    setUser(fbUser);
  }, [createSession]);

  const register = useCallback(async (
    name: string, email: string, password: string, phone: string,
  ) => {
    const { user: fbUser } = await createUserWithEmailAndPassword(
      clientAuth(), email, password,
    );
    await updateProfile(fbUser, { displayName: name });

    await fetch('/api/auth/register-profile', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, phone, uid: fbUser.uid }),
    });

    await createSession(fbUser);
    setUser(fbUser);
  }, [createSession]);

  const logout = useCallback(async () => {
    await signOut(clientAuth());
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(clientAuth(), email);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

const AUTH_DEFAULT: AuthCtx = {
  user:          null,
  loading:       true,
  login:         async () => {},
  register:      async () => {},
  logout:        async () => {},
  resetPassword: async () => {},
};

export function useAuth(): AuthCtx {
  return useContext(AuthContext) ?? AUTH_DEFAULT;
}
