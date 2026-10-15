// OWNER: Sky. Google sign-in for the team admin page (web demo #admin), as an alternative to DEMO_ADMIN_TOKEN.
// The page signs in with Google through Firebase Auth and sends `Authorization: Bearer <Firebase ID token>`.
// A request is an admin request when the token verifies, the sign-in was Google, the email is verified, and the email
// is in ADMIN_EMAILS (comma-separated, read here like the LLM_* vars). Empty ADMIN_EMAILS = nobody gets in this way.
// Tete wires it into requireAdmin in routes/dev.ts; the x-admin-token check stays for the terminal scripts.
import { getAuth } from "firebase-admin/auth";

export interface VerifiedToken {
  email?: string;
  email_verified?: boolean;
  firebase: { sign_in_provider: string };
}
type Verify = (idToken: string) => Promise<VerifiedToken>;

export function adminEmails(raw = process.env.ADMIN_EMAILS ?? ""): Set<string> {
  return new Set(raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean));
}

/** The admin's email when the Authorization header carries an allowed Google sign-in, else null. Never throws. */
export async function adminEmailFromRequest(
  authorization: string | undefined,
  verify: Verify = async t => {
    await import("../firebase"); // initializes the default firebase-admin app (lazy, so tests don't need credentials)
    return getAuth().verifyIdToken(t) as Promise<VerifiedToken>;
  },
  allowed: Set<string> = adminEmails(),
): Promise<string | null> {
  const m = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  if (!m || allowed.size === 0) return null;
  try {
    const t = await verify(m[1]);
    const email = t.email?.toLowerCase();
    if (!email || t.email_verified !== true || t.firebase?.sign_in_provider !== "google.com") return null;
    return allowed.has(email) ? email : null;
  } catch {
    return null; // expired, forged, wrong project: same as no header
  }
}
