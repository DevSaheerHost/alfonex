import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Firebase public config — these are not secrets; Firebase security is
// enforced by database rules and authorized domains, not by hiding this.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || 'AIzaSyCTM2dhEVY5lFq7bNkIR7Gne-phh0nABXQ',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'update1-b4bf5.firebaseapp.com',
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL       || 'https://update1-b4bf5-default-rtdb.firebaseio.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || 'update1-b4bf5',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'update1-b4bf5.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1049308656123',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '1:1049308656123:web:c966f04f25a0322ac71b5e',
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
