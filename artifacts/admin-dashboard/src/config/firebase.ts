/**
 * Firebase configuration and initialization.
 *
 * Copy .env.example → .env and fill in your VITE_FIREBASE_* credentials.
 * When credentials are absent the app renders but Firebase features are disabled.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, type Database } from 'firebase/database';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from 'firebase/storage';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isConfigured = Boolean(apiKey);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _rtdb: Database | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

if (isConfigured) {
  const firebaseConfig = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  };

  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _rtdb = getDatabase(_app);
  _db = getFirestore(_app);
  _storage = getStorage(_app);

  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(_auth, 'http://localhost:9099', { disableWarnings: true });
    connectDatabaseEmulator(_rtdb, 'localhost', 9000);
    connectFirestoreEmulator(_db, 'localhost', 8080);
    connectStorageEmulator(_storage, 'localhost', 9199);
  }
} else if (import.meta.env.DEV) {
  console.warn(
    '[Firebase] No credentials found. Copy .env.example → .env and add VITE_FIREBASE_* values.',
  );
}

export const firebaseApp = _app;
export const auth = _auth;
export const rtdb = _rtdb;
export const db = _db;
export const storage = _storage;
export default _app;
