import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseConfig, PREVIEW_MODE } from "./env";

// Google sign-in for the admin page only. It runs in its own named Firebase app, so it never replaces the anonymous
// session the public inbox uses (lib/firebase.ts). The server accepts the ID token when the email is in ADMIN_EMAILS.
const app = PREVIEW_MODE ? null : initializeApp(firebaseConfig, "admin");
const auth = app ? getAuth(app) : null;

export type AdminUser = { email: string; getToken: () => Promise<string> } | null;

export function useAdminUser(): { user: AdminUser; ready: boolean } {
  const [state, setState] = useState<{ user: AdminUser; ready: boolean }>({ user: null, ready: !auth });
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u: User | null) => {
      const google = u && u.providerData.some(p => p.providerId === "google.com") && u.email;
      setState({ user: google ? { email: u.email!, getToken: () => u.getIdToken() } : null, ready: true });
    });
  }, []);
  return state;
}

/** Opens the Google popup. Returns an error message to show, or null on success. */
export async function signInWithGoogle(): Promise<string | null> {
  if (!auth) return "Firebase isn't configured in this build.";
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    return null;
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
    if (code === "auth/operation-not-allowed") return "Google sign-in isn't turned on in Firebase yet (Authentication → Sign-in method → Google).";
    if (code === "auth/unauthorized-domain") return `Add ${window.location.hostname} to Firebase Authentication → Settings → Authorized domains.`;
    if (code === "auth/popup-blocked") return "The browser blocked the sign-in popup. Allow popups for this site and try again.";
    return `Google sign-in failed (${code || (e instanceof Error ? e.message : String(e))}).`;
  }
}

export function signOutAdmin() {
  return auth ? signOut(auth) : Promise.resolve();
}
