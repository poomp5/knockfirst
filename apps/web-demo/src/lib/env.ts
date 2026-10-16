// Public build-time config (Vite inlines VITE_* into the bundle). Never put secrets here.
const e = import.meta.env;

export const firebaseConfig = {
  apiKey: e.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: e.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: e.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: e.VITE_FIREBASE_APP_ID as string | undefined,
};

export const FAMILY_ID = (e.VITE_FAMILY_ID as string | undefined) || "demo-family";
export const SERVER_URL = ((e.VITE_SERVER_URL as string | undefined) ?? "").replace(/\/+$/, "");
export const APK_URL =
  (e.VITE_APK_URL as string | undefined) || "https://github.com/poomp5/knockfirst/releases/latest/download/knockfirst.apk";
export const REPO_URL = (e.VITE_REPO_URL as string | undefined) || "https://github.com/poomp5/knockfirst";

/** No Firebase config → local preview with clearly labelled sample cards (never in a configured build). */
export const PREVIEW_MODE = !firebaseConfig.apiKey || !firebaseConfig.projectId;
