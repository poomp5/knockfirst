import { useEffect, useRef, useState } from "react";
import { signInWithGoogle, signOutAdmin, useAdminUser } from "../lib/adminAuth";
import type { TranscriptTurn } from "../lib/contract";
import demoCases from "../lib/demoCases.json";
import { FAMILY_ID, SERVER_URL } from "../lib/env";
import { useCalls } from "../lib/useCalls";

// Team-only page at #admin: reset the demo family and load the 5 stage-demo calls before going on stage.
// Uses the server's admin endpoints (/demo/reset, /dev/simulate-call). Two ways in:
// - Google sign-in (main): the server lets the account in when its email is in ADMIN_EMAILS (server/src/ai/adminAuth.ts).
// - DEMO_ADMIN_TOKEN (fallback): typed once or opened as #admin/<token> (removed from the address bar right away),
//   remembered in localStorage after the server accepts it. Never part of the public bundle.
// Auto-lock: Google sign-in forgets any saved token, and 15 minutes without use signs out and forgets the token.
const TOKEN_KEY = "kf-admin-token";
const LOCK_AFTER_MS = 15 * 60_000;
const CASES = demoCases as { id: string; title: string; from: string; transcript: TranscriptTurn[] }[];

type Health = { kind: "checking" } | { kind: "ok"; version: number } | { kind: "down"; detail: string };
type Row = { id: string; title: string; state: "waiting" | "sending" | "done" | "failed"; detail?: string };

function readToken() {
  const fromLink = window.location.hash.match(/^#admin\/(.+)$/);
  if (fromLink) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#admin`);
    try { return decodeURIComponent(fromLink[1]).trim(); } catch { return ""; }
  }
  try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
}
function saveToken(v: string) {
  try { if (v) localStorage.setItem(TOKEN_KEY, v); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}

const DENIED_GOOGLE = "This Google account isn't allowed. Ask Tete to add it to ADMIN_EMAILS on Railway.";
const DENIED_TOKEN = "Wrong admin token";

async function post(path: string, auth: Record<string, string>, denied: string, body: unknown) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (res.status === 401) throw new Error(denied);
  if (!res.ok) throw new Error(`Server answered ${res.status}: ${text.slice(0, 120)}`);
  return JSON.parse(text);
}

export function AdminPanel() {
  const [token, setToken] = useState(readToken);
  const [health, setHealth] = useState<Health>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null); // a reset needs a second click on the same button
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(() => readToken() !== "");
  const { user, ready: authReady } = useAdminUser();
  const inbox = useCalls();
  const armTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = "KnockFirst admin";
    if (!SERVER_URL) { setHealth({ kind: "down", detail: "VITE_SERVER_URL is not set in this build" }); return; }
    fetch(`${SERVER_URL}/health`)
      .then(r => r.json())
      .then(j => setHealth(j.ok ? { kind: "ok", version: j.contractVersion } : { kind: "down", detail: "health check failed" }))
      .catch(e => setHealth({ kind: "down", detail: e instanceof Error ? e.message : String(e) }));
    // A sign-in link opened in a tab that already shows the admin page.
    const onHash = () => { if (window.location.hash.startsWith("#admin/")) setToken(readToken()); };
    window.addEventListener("hashchange", onHash);
    return () => { window.clearTimeout(armTimer.current); window.removeEventListener("hashchange", onHash); };
  }, []);

  // Google sign-in replaces the token: forget any saved one.
  useEffect(() => {
    if (user) { saveToken(""); setToken(""); setShowToken(false); }
  }, [user]);

  // Auto-lock after 15 minutes without use.
  useEffect(() => {
    if (!user && !token) return;
    let timer = window.setTimeout(lock, LOCK_AFTER_MS);
    const poke = () => { window.clearTimeout(timer); timer = window.setTimeout(lock, LOCK_AFTER_MS); };
    function lock() {
      void signOutAdmin(); saveToken(""); setToken("");
      setMessage({ ok: true, text: "Locked after 15 minutes without use. Sign in again to continue." });
    }
    const events = ["pointerdown", "keydown", "visibilitychange"] as const;
    events.forEach(e => window.addEventListener(e, poke));
    return () => { window.clearTimeout(timer); events.forEach(e => window.removeEventListener(e, poke)); };
  }, [user, token]);

  const signedIn = !!user || token.length >= 16;
  const ready = health.kind === "ok" && signedIn && !busy;

  async function call(path: string, body: unknown) {
    if (user) return post(path, { authorization: `Bearer ${await user.getToken()}` }, DENIED_GOOGLE, body);
    return post(path, { "x-admin-token": token }, DENIED_TOKEN, body);
  }

  async function reset() {
    const r = await call("/demo/reset", { familyId: FAMILY_ID });
    const d = r.deleted ?? {};
    return `Inbox cleared: ${d.calls ?? 0} calls, ${d.blocked ?? 0} blocked numbers, ${d.whitelist ?? 0} added known callers, ${d.globalReports ?? 0} blocklist reports. Seed callers kept.`;
  }

  async function load() {
    setRows(CASES.map(c => ({ id: c.id, title: c.title, state: "waiting" })));
    let failed = 0;
    for (const c of CASES) {
      setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "sending" } : r)));
      try {
        const j = await call("/dev/simulate-call", { familyId: FAMILY_ID, from: c.from, transcript: c.transcript });
        const score = j.analysis?.riskScore ?? "–";
        const status = String(j.status).replace("_", " ");
        setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "done", detail: `${status}, risk ${score}` } : r)));
      } catch (e) {
        failed++;
        const detail = e instanceof Error ? e.message : String(e);
        setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "failed", detail } : r)));
        if (detail === DENIED_TOKEN || detail === DENIED_GOOGLE) { setRows([]); throw e; }
      }
    }
    return failed ? `${CASES.length - failed} of ${CASES.length} demo calls loaded.` : `All ${CASES.length} demo calls loaded and analyzed.`;
  }

  async function run(steps: ("reset" | "load")[]) {
    const key = steps.join("+");
    window.clearTimeout(armTimer.current);
    if (steps.includes("reset") && armed !== key) {
      setArmed(key);
      armTimer.current = window.setTimeout(() => setArmed(null), 5000);
      return;
    }
    setArmed(null);
    setBusy(true);
    setMessage(null);
    try {
      const done: string[] = [];
      if (steps.includes("reset")) done.push(await reset());
      if (steps.includes("load")) done.push(await load());
      if (!user) saveToken(token); // only a token the server accepted is kept
      setMessage({ ok: true, text: done.join(" ") });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const count = inbox.kind === "live" ? inbox.calls.length : null;

  return (
    <main className="admin">
      <header className="admin-head">
        <img src="/brand/logo-wordmark.png" alt="KnockFirst" height="26" />
        <a href="/">Back to the demo</a>
      </header>

      <h1>Demo admin</h1>
      <p className="admin-lead">Clean the inbox and load the stage-demo calls for <strong>{FAMILY_ID}</strong>. For the team only.</p>

      <dl className="admin-facts">
        <div>
          <dt>Server</dt>
          <dd>{health.kind === "checking" ? "Checking…" : health.kind === "ok" ? `Online (contract v${health.version})` : `Offline: ${health.detail}`}</dd>
        </div>
        <div>
          <dt>Calls in the inbox</dt>
          <dd aria-live="polite">{count ?? (inbox.kind === "error" ? "Can't read Firestore" : "…")}</dd>
        </div>
      </dl>

      <section className="admin-signin" aria-label="Sign in">
        {user ? (
          <p className="admin-who">
            Signed in as <strong>{user.email}</strong>{" "}
            <button type="button" className="link-btn" onClick={() => void signOutAdmin()}>Sign out</button>
          </p>
        ) : (
          <>
            <button type="button" className="btn btn--google" disabled={!authReady || busy} onClick={async () => {
              setMessage(null);
              const err = await signInWithGoogle();
              if (err) setMessage({ ok: false, text: err });
            }}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" />
                <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.7-3-.7-4.7s.3-3.2.7-4.7l-7.8-6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.8-6z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
              </svg>
              Sign in with Google
            </button>
            <p className="admin-hint">Team accounts only (ADMIN_EMAILS on the server).</p>

            {!showToken ? (
              <p className="admin-hint"><button type="button" className="link-btn" onClick={() => setShowToken(true)}>Use the admin token instead</button></p>
            ) : (
              <>
                <label className="field admin-token">
                  <span>Admin token (DEMO_ADMIN_TOKEN)</span>
                  <input type="password" autoComplete="off" spellCheck={false} value={token} onChange={e => setToken(e.target.value.trim())} />
                </label>
                <p className="admin-hint">
                  Remembered on this device once the server accepts it.{" "}
                  {token && (
                    <>
                      <button type="button" className="link-btn" onClick={() => {
                        void navigator.clipboard?.writeText(`${window.location.origin}/#admin/${encodeURIComponent(token)}`).then(() => {
                          setCopied(true); window.setTimeout(() => setCopied(false), 2500);
                        });
                      }}>{copied ? "Link copied" : "Copy sign-in link"}</button>
                      {"  "}
                      <button type="button" className="link-btn" onClick={() => { saveToken(""); setToken(""); setMessage(null); }}>Forget token</button>
                    </>
                  )}
                </p>
                <p className="admin-hint">The sign-in link contains the token: send it only in private chat, never in the group or on slides.</p>
              </>
            )}
          </>
        )}
        <p className="admin-hint">Locks itself after 15 minutes without use.</p>
      </section>

      <div className="admin-actions">
        <button className="btn btn--primary" disabled={!ready} onClick={() => run(["reset", "load"])}>
          {armed === "reset+load" ? "Click again to reset and load" : "Reset and load demo calls"}
        </button>
        <button className="btn btn--chip" disabled={!ready} onClick={() => run(["load"])}>Load demo calls only</button>
        <button className="btn btn--chip" disabled={!ready} onClick={() => run(["reset"])}>
          {armed === "reset" ? "Click again to reset" : "Reset inbox only"}
        </button>
      </div>
      <p className="admin-hint">Reset deletes every call, blocked number and added known caller of this family. Loading takes about 30 seconds.</p>

      {message && (
        <p className={`note ${message.ok ? "note--ok" : "note--error"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>
      )}

      {rows.length > 0 && (
        <ol className="admin-rows">
          {rows.map(r => (
            <li key={r.id} className={`admin-row admin-row--${r.state}`}>
              <span className="admin-row-title">{r.title}</span>
              <span className="admin-row-state">
                {r.state === "waiting" ? "Waiting" : r.state === "sending" ? "Analyzing…" : r.detail}
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
