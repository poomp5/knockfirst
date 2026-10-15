import { useEffect, useRef, useState, type FormEvent } from "react";
import { signInWithGoogle, signOutAdmin, useAdminUser } from "../lib/adminAuth";
import type { TranscriptTurn } from "../lib/contract";
import demoCases from "../lib/demoCases.json";
import { FAMILY_ID, SERVER_URL } from "../lib/env";
import { useCalls } from "../lib/useCalls";

// Team-only page at /admin: reset the demo family and load the 5 stage-demo calls before going on stage.
// Uses the server's admin endpoints (/demo/reset, /dev/simulate-call). Two ways in:
// - Username + password (main): the password is the team admin password, DEMO_ADMIN_TOKEN in the server env. The
//   server knows only that one password, so the username is just the name shown on this page. Log in checks the
//   password with the server (a request that creates nothing). Remembered in localStorage until Log out.
// - Google sign-in: the server lets the account in when its email is in ADMIN_EMAILS (server/src/ai/adminAuth.ts).
// The password is never part of the public bundle. Auto-lock: 15 minutes without use logs out.
const TOKEN_KEY = "kf-admin-token";
const NAME_KEY = "kf-admin-name";
const LOCK_AFTER_MS = 15 * 60_000;
const CASES = demoCases as { id: string; title: string; from: string; transcript: TranscriptTurn[] }[];

type Health = { kind: "checking" } | { kind: "ok"; version: number } | { kind: "down"; detail: string };
type Row = { id: string; title: string; state: "waiting" | "sending" | "done" | "failed"; detail?: string };
type Session = { name: string; token: string } | null;

const DENIED = "Wrong password";
const DENIED_GOOGLE = "This Google account isn't allowed yet. Use username and password instead.";

function store(key: string, v: string) {
  try { if (v) localStorage.setItem(key, v); else localStorage.removeItem(key); } catch { /* private mode */ }
}
function load(key: string) {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}
/** A saved session, or one from an #admin/<password> link (removed from the address bar right away). */
function savedSession(): Session {
  const fromLink = window.location.hash.match(/^#admin\/(.+)$/);
  if (fromLink) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#admin`);
    try { return { name: load(NAME_KEY) || "Team", token: decodeURIComponent(fromLink[1]).trim() }; } catch { return null; }
  }
  const token = load(TOKEN_KEY);
  return token ? { name: load(NAME_KEY) || "Team", token } : null;
}

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

/** True when the server accepts the password. An empty body is rejected (400) only after the password check (401). */
async function checkPassword(token: string): Promise<boolean> {
  const res = await fetch(`${SERVER_URL}/dev/simulate-call`, {
    method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: "{}",
  });
  if (res.status === 401) return false;
  if (res.status === 400) return true;
  throw new Error(`Server answered ${res.status}`);
}

export function AdminPanel() {
  const [session, setSession] = useState<Session>(savedSession);
  const [verified, setVerified] = useState(false);
  const [formName, setFormName] = useState(() => load(NAME_KEY));
  const [formPass, setFormPass] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [health, setHealth] = useState<Health>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null); // a reset needs a second click on the same button
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const { user } = useAdminUser();
  const inbox = useCalls();
  const armTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = "KnockFirst admin";
    if (!SERVER_URL) { setHealth({ kind: "down", detail: "VITE_SERVER_URL is not set in this build" }); return; }
    fetch(`${SERVER_URL}/health`)
      .then(r => r.json())
      .then(j => setHealth(j.ok ? { kind: "ok", version: j.contractVersion } : { kind: "down", detail: "health check failed" }))
      .catch(e => setHealth({ kind: "down", detail: e instanceof Error ? e.message : String(e) }));
    const onHash = () => { if (window.location.hash.startsWith("#admin/")) { setVerified(false); setSession(savedSession()); } };
    window.addEventListener("hashchange", onHash);
    return () => { window.clearTimeout(armTimer.current); window.removeEventListener("hashchange", onHash); };
  }, []);

  function logOut() {
    store(TOKEN_KEY, ""); setSession(null); setVerified(false); setFormPass(""); setRows([]);
    void signOutAdmin();
  }

  // A saved password is checked again on every visit; a changed password logs out.
  useEffect(() => {
    if (!session || verified) return;
    let cancelled = false;
    checkPassword(session.token)
      .then(ok => {
        if (cancelled) return;
        if (ok) { setVerified(true); store(TOKEN_KEY, session.token); store(NAME_KEY, session.name); }
        else { logOut(); setMessage({ ok: false, text: "The saved password no longer works. Log in again." }); }
      })
      .catch(() => { if (!cancelled) setVerified(true); }); // server unreachable: keep the session, actions will report it
    return () => { cancelled = true; };
  }, [session, verified]);

  // Auto-lock after 15 minutes without use.
  useEffect(() => {
    if (!user && !session) return;
    let timer = window.setTimeout(lock, LOCK_AFTER_MS);
    const poke = () => { window.clearTimeout(timer); timer = window.setTimeout(lock, LOCK_AFTER_MS); };
    function lock() {
      logOut();
      setMessage({ ok: true, text: "Logged out after 15 minutes without use." });
    }
    const events = ["pointerdown", "keydown", "visibilitychange"] as const;
    events.forEach(e => window.addEventListener(e, poke));
    return () => { window.clearTimeout(timer); events.forEach(e => window.removeEventListener(e, poke)); };
  }, [user, session]);

  async function logIn(e: FormEvent) {
    e.preventDefault();
    const name = formName.trim() || "Team";
    const token = formPass.trim();
    if (!token) return;
    setLoggingIn(true);
    setMessage(null);
    try {
      if (await checkPassword(token)) {
        store(TOKEN_KEY, token); store(NAME_KEY, name);
        setSession({ name, token }); setVerified(true); setFormPass("");
      } else {
        setMessage({ ok: false, text: `${DENIED}. Use the team admin password (DEMO_ADMIN_TOKEN on Railway).` });
      }
    } catch (err) {
      setMessage({ ok: false, text: `Can't reach the server: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoggingIn(false);
    }
  }

  const who = session && verified ? session.name : user ? user.email : null;
  const ready = health.kind === "ok" && !!who && !busy;

  async function call(path: string, body: unknown) {
    if (session && verified) return post(path, { "x-admin-token": session.token }, DENIED, body);
    if (user) return post(path, { authorization: `Bearer ${await user.getToken()}` }, DENIED_GOOGLE, body);
    throw new Error("Log in first");
  }

  async function reset() {
    const r = await call("/demo/reset", { familyId: FAMILY_ID });
    const d = r.deleted ?? {};
    return `Inbox cleared: ${d.calls ?? 0} calls, ${d.blocked ?? 0} blocked numbers, ${d.whitelist ?? 0} added known callers, ${d.globalReports ?? 0} blocklist reports. Seed callers kept.`;
  }

  async function loadDemo() {
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
        if (detail === DENIED || detail === DENIED_GOOGLE) { setRows([]); throw e; }
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
      if (steps.includes("load")) done.push(await loadDemo());
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

      {who ? (
        <>
          <p className="admin-who">
            Logged in as <strong>{who}</strong>{" "}
            <button type="button" className="link-btn" onClick={() => { logOut(); setMessage(null); }}>Log out</button>
          </p>
          <p className="admin-hint">Logs out by itself after 15 minutes without use.</p>

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
        </>
      ) : session ? (
        <p className="admin-hint">Checking your saved login…</p>
      ) : (
        <form className="admin-login" onSubmit={logIn}>
          <h2>Log in</h2>
          <label className="field">
            <span>Username</span>
            <input name="username" autoComplete="username" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Your name" />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" spellCheck={false} required
              value={formPass} onChange={e => setFormPass(e.target.value)} />
          </label>
          <p className="admin-hint">The password is the team admin password. Your browser can save it for next time.</p>
          <button className="btn btn--primary" type="submit" disabled={loggingIn || !formPass.trim()}>
            {loggingIn ? "Checking…" : "Log in"}
          </button>
          <p className="admin-alt">
            <button type="button" className="link-btn" onClick={async () => {
              setMessage(null);
              const err = await signInWithGoogle();
              if (err) setMessage({ ok: false, text: err });
            }}>Or sign in with Google</button>
          </p>
        </form>
      )}

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
