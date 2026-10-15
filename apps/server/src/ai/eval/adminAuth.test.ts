// OWNER: Sky. Checks adminEmailFromRequest with a fake verifier (no Firebase needed).
//   npx tsx src/ai/eval/adminAuth.test.ts
import assert from "node:assert/strict";
import { adminEmailFromRequest, adminEmails, type VerifiedToken } from "../adminAuth";

async function main() {
  const allowed = adminEmails(" Sky@Example.com, tete@example.com ,");
  const tokens: Record<string, VerifiedToken> = {
    good: { email: "sky@example.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
    stranger: { email: "judge@example.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
    unverified: { email: "sky@example.com", email_verified: false, firebase: { sign_in_provider: "google.com" } },
    anonymous: { firebase: { sign_in_provider: "anonymous" } },
    password: { email: "sky@example.com", email_verified: true, firebase: { sign_in_provider: "password" } },
  };
  const verify = async (t: string) => { if (!tokens[t]) throw new Error("bad token"); return tokens[t]; };
  const check = (h: string | undefined, a = allowed) => adminEmailFromRequest(h, verify, a);

  const cases: [string, Promise<string | null>, string | null][] = [
    ["allowed Google account", check("Bearer good"), "sky@example.com"],
    ["scheme is case-insensitive", check("bearer good"), "sky@example.com"],
    ["email not on the list", check("Bearer stranger"), null],
    ["unverified email", check("Bearer unverified"), null],
    ["anonymous session (the public inbox)", check("Bearer anonymous"), null],
    ["non-Google provider", check("Bearer password"), null],
    ["forged / expired token", check("Bearer nope"), null],
    ["no header", check(undefined), null],
    ["not a Bearer header", check("Basic good"), null],
    ["empty ADMIN_EMAILS lets nobody in", check("Bearer good", adminEmails("")), null],
  ];
  for (const [name, got, want] of cases) {
    assert.equal(await got, want, name);
    console.log(`PASS ${name}`);
  }
  console.log(`\n${cases.length}/${cases.length} pass`);
}

main().catch(e => { console.error(e); process.exit(1); });
