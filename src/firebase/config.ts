// -----------------------------------------------------------------------------
// Firebase app initialization. See docs/PROJECT_SPECIFICATION.md (Sections 6 & 7)
// and docs/ARCHITECTURE_DECISIONS.md (ADR-003, ADR-004, ADR-011) for the
// reasoning behind Firestore + Anonymous Auth. (ADR-004's join-code custom
// claim, minted by a Cloud Function, has been removed and replaced by
// ADR-011's Firestore-profile-based membership check — see
// DEVELOPMENT_STATUS.md.)
//
// This is the ONLY file that calls initializeApp(). Every other Firebase
// module (auth.ts, firestore.ts) imports the singleton instances from here
// instead of creating their own.
// -----------------------------------------------------------------------------

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const REQUIRED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/**
 * Reads Firebase config from environment variables without initializing
 * anything. Returns `null` when config is absent, so the app can still
 * render a "Firebase isn't configured yet" state during local dev — unless
 * VITE_FIREBASE_OPTIONAL is explicitly set to "false".
 */
export function getFirebaseConfig(): FirebaseClientConfig | null {
  const env = import.meta.env;
  const missing = REQUIRED_ENV_KEYS.filter((key) => !env[key]);

  if (missing.length > 0) {
    if (env.VITE_FIREBASE_OPTIONAL === 'false') {
      throw new Error(`Missing required Firebase env vars: ${missing.join(', ')}`);
    }
    return null;
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let authInstance: Auth | null = null;
let initAttempted = false;

/**
 * Lazily initializes the Firebase app + Firestore (with offline persistence,
 * per ADR-005) + Auth, exactly once. Safe to call repeatedly — subsequent
 * calls return the same instances. Returns `null` for each if config is
 * absent (foundation-mode / local dev without a Firebase project yet).
 */
function ensureInitialized(): { app: FirebaseApp; db: Firestore; auth: Auth } | null {
  if (initAttempted) {
    return app && db && authInstance ? { app, db, auth: authInstance } : null;
  }
  initAttempted = true;

  const config = getFirebaseConfig();
  if (!config) return null;

  app = getApps().length > 0 ? getApps()[0] : initializeApp(config);

  // Offline persistence (IndexedDB-backed), multi-tab aware — ADR-005.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  authInstance = getAuth(app);

  return { app, db, auth: authInstance };
}

export function getDb(): Firestore | null {
  return ensureInitialized()?.db ?? null;
}

export function getFirebaseAuth(): Auth | null {
  return ensureInitialized()?.auth ?? null;
}

/** True once a Firebase project is configured and initialized. */
export function isFirebaseConfigured(): boolean {
  return ensureInitialized() !== null;
}
