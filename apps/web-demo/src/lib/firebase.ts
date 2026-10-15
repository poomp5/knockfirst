import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, PREVIEW_MODE } from "./env";

const app = PREVIEW_MODE ? null : initializeApp(firebaseConfig);
export const db: Firestore | null = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

let ready: Promise<User> | null = null;

/** Anonymous sign-in (the Firestore rules require it). Resolves once, then reuses the session. */
export function ensureSignedIn(): Promise<User> {
  if (!auth) return Promise.reject(new Error("firebase not configured"));
  ready ??= new Promise<User>((resolve, reject) => {
    const stop = onAuthStateChanged(auth, user => {
      if (user) { stop(); resolve(user); }
    });
    signInAnonymously(auth).catch(err => { stop(); ready = null; reject(err); });
  });
  return ready;
}
