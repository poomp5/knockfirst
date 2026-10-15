// Firebase JS SDK client (B2). No metro.config.js tweak is needed: Expo's
// "Using Firebase" guide says firebase@12+ works with the default Metro config (SDK 57).
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  signInAnonymously,
  type Auth,
} from "firebase/auth";
import { DEFAULT_FAMILY_ID } from "./contract";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** True when the env has enough Firebase config to connect. */
export const FIREBASE_CONFIGURED = Boolean(config.apiKey && config.projectId && config.appId);

/**
 * Mock mode: explicit EXPO_PUBLIC_USE_MOCKS=true, or Firebase env missing
 * (falls back to mocks instead of crashing at startup; a warning is logged).
 */
export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === "true" || !FIREBASE_CONFIGURED;
if (USE_MOCKS && process.env.EXPO_PUBLIC_USE_MOCKS !== "true") {
  console.warn("[firebase] EXPO_PUBLIC_FIREBASE_* env is missing → running with mock data");
}

export const FAMILY_ID = process.env.EXPO_PUBLIC_FAMILY_ID || DEFAULT_FAMILY_ID;

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

if (!USE_MOCKS) {
  _app = getApps().length ? getApp() : initializeApp(config);
  try {
    _db = initializeFirestore(_app, { experimentalAutoDetectLongPolling: true }); // RN networking needs this
  } catch {
    _db = getFirestore(_app); // fast refresh re-init
  }
  try {
    // Memory persistence: we re-sign-in anonymously on every launch (no AsyncStorage dependency).
    _auth = initializeAuth(_app, { persistence: inMemoryPersistence });
  } catch {
    _auth = getAuth(_app); // fast refresh re-init
  }
}

/**
 * In mock mode these are never initialized (null at runtime). Only lib code touches them,
 * and only behind `if (!USE_MOCKS)`. Screens should use hooks/actions instead.
 */
export const app = _app as FirebaseApp;
export const db = _db as Firestore;
export const auth = _auth as Auth;

let signInPromise: Promise<void> | null = null;

/** Anonymous sign-in, idempotent and shared between callers. No-op in mock mode. */
export function ensureSignedIn(): Promise<void> {
  if (USE_MOCKS || !_auth) return Promise.resolve();
  if (_auth.currentUser) return Promise.resolve();
  if (!signInPromise) {
    const a = _auth;
    signInPromise = signInAnonymously(a)
      .then(() => undefined)
      .catch((e: unknown) => {
        signInPromise = null; // allow retry
        throw e;
      });
  }
  return signInPromise;
}
