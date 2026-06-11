import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

let _auth: Auth | null = null;

export function clientAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

// Re-export getApp so pages can access the client app for RTDB subscriptions
export { getApp };
