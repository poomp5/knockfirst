import { useEffect, useRef, useState, type FormEvent } from "react";
import { signInWithGoogle, signOutAdmin, useAdminUser } from "../lib/adminAuth";
import { RISK_LABEL_EN, riskLevelFromScore, type RiskLevel, type TranscriptTurn } from "../lib/contract";
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
type Row = { id: string; title: string; state: "waiting" | "sending" | "done" | "failed"; detail?: string; score?: number; level?: RiskLevel; blocked?: boolean };
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
    const n = (k: number | undefined, one: string, many: string) => `${k ?? 0} ${(k ?? 0) === 1 ? one : many}`;
    return `Inbox cleared: ${n(d.calls, "call", "calls")}, ${n(d.blocked, "blocked number", "blocked numbers")}, ${n(d.whitelist, "added known caller", "added known callers")}, ${n(d.globalReports, "blocklist report", "blocklist reports")}. Seed callers kept.`;
  }

  async function loadDemo() {
    setRows(CASES.map(c => ({ id: c.id, title: c.title, state: "waiting" })));
    let failed = 0;
    for (const c of CASES) {
      setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "sending" } : r)));
      try {
        const j = await call("/dev/simulate-call", { familyId: FAMILY_ID, from: c.from, transcript: c.transcript });
        const score: number | undefined = j.analysis?.riskScore;
        const level: RiskLevel | undefined = j.analysis?.riskLevel ?? (score != null ? riskLevelFromScore(score) : undefined);
        const blocked = j.status === "auto_blocked";
        const detail = blocked ? "Auto-blocked" : j.status === "needs_review" ? "Waiting for the family" : String(j.status).replace("_", " ");
        setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "done", detail, score, level, blocked } : r)));
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
  const demo = CASES.length;
  const status: { tone: "ok" | "warn" | "bad" | "wait"; title: string; detail: string } =
    health.kind === "down" ? { tone: "bad", title: "Server offline", detail: `Can't reach the KnockFirst server (${health.detail}). Calls and the admin buttons won't work.` }
    : health.kind === "checking" || count === null ? { tone: "wait", title: "Checking the demo…", detail: "Looking at the server and the inbox." }
    : busy ? { tone: "wait", title: "Getting the stage ready…", detail: "Keep this page open. It takes about 30 seconds." }
    : count === demo ? { tone: "ok", title: "Ready for stage", detail: `The inbox holds the ${demo} demo calls.` }
    : count === 0 ? { tone: "bad", title: "The inbox is empty", detail: `Load the ${demo} demo calls before the pitch.` }
    : { tone: "warn", title: `${count} calls in the inbox`, detail: `Reset before the pitch, so judges see the ${demo} demo calls.` };

  const logo = (
    <header className="admin-top">
      <a href="/" className="admin-brand"><img src="/brand/logo-wordmark.png" alt="KnockFirst" /></a>
      {who ? (
        <span className="admin-user">
          <span className="admin-avatar" aria-hidden="true">{who.slice(0, 1).toUpperCase()}</span>
          <span className="admin-user-name">{who}</span>
          <button type="button" className="link-btn" onClick={() => { logOut(); setMessage(null); }}>Log out</button>
        </span>
      ) : (
        <a href="/" className="admin-back">Back to the demo</a>
      )}
    </header>
  );

  const note = message && (
    <p className={`note ${message.ok ? "note--ok" : "note--error"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>
  );

  if (!who) {
    return (
      <main className="admin">
        {logo}
        {session ? (
          <p className="admin-checking">Checking your saved login…</p>
        ) : (
          <div className="admin-gate">
            <div className="admin-door" aria-hidden="true">
              <img src="/brand/logo-mark.png" alt="" />
              <span className="admin-door-knock"><i /><i /><i /></span>
            </div>
            <form className="admin-login" onSubmit={logIn}>
              <h1>Team login</h1>
              <p className="admin-sub">Get the demo ready before the pitch.</p>
              <label className="field">
                <span>Username</span>
                <input name="username" autoComplete="username" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Your name" />
              </label>
              <label className="field">
                <span>Password</span>
                <input name="password" type="password" autoComplete="current-password" spellCheck={false} required
                  value={formPass} onChange={e => setFormPass(e.target.value)} />
              </label>
              <button className="btn btn--primary admin-wide" type="submit" disabled={loggingIn || !formPass.trim()}>
                {loggingIn ? "Checking…" : "Log in"}
              </button>
              <p className="admin-hint">Use the team admin password. Your browser can save it for next time.</p>
              <p className="admin-alt">
                <button type="button" className="link-btn" onClick={async () => {
                  setMessage(null);
                  const err = await signInWithGoogle();
                  if (err) setMessage({ ok: false, text: err });
                }}>Sign in with Google instead</button>
              </p>
              {note}
            </form>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="admin">
      {logo}

      <section className={`admin-status admin-status--${status.tone}`} aria-live="polite">
        <span className="admin-status-dot" aria-hidden="true" />
        <div>
          <h1>{status.title}</h1>
          <p>{status.detail}</p>
        </div>
      </section>

      <ul className="admin-checks">
        <li className={health.kind === "ok" ? "is-ok" : health.kind === "down" ? "is-bad" : ""}>
          <span>Server</span>
          <strong title={health.kind === "ok" ? `Contract v${health.version}` : undefined}>{health.kind === "ok" ? "Online" : health.kind === "down" ? "Offline" : "Checking"}</strong>
        </li>
        <li className={count === demo ? "is-ok" : count === null ? "" : "is-warn"}>
          <span>Inbox ({FAMILY_ID})</span>
          <strong>{count === null ? (inbox.kind === "error" ? "Can't read" : "Checking") : `${count} ${count === 1 ? "call" : "calls"}`}</strong>
        </li>
        <li className="is-ok">
          <span>Logged in</span>
          <strong>{who}</strong>
        </li>
      </ul>

      <button className="btn btn--primary admin-wide admin-go" disabled={!ready} onClick={() => run(["reset", "load"])}>
        {busy ? "Working…" : armed === "reset+load" ? "Tap again to confirm" : `Reset and load the ${demo} demo calls`}
      </button>
      <p className="admin-hint">Resets this family's calls, blocked numbers and added known callers. Seed callers stay.</p>

      <div className="admin-more" role="group" aria-label="Other actions">
        <button type="button" className="admin-opt" disabled={!ready} onClick={() => run(["load"])}>
          <span className="admin-opt-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span className="admin-opt-text">
            <strong>Add the demo calls without resetting</strong>
            <small>Keeps every call already in the inbox and adds the {demo} demo calls on top.</small>
          </span>
        </button>
        <button type="button" className={`admin-opt admin-opt--danger${armed === "reset" ? " is-armed" : ""}`} disabled={!ready} onClick={() => run(["reset"])}>
          <span className="admin-opt-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
          </span>
          <span className="admin-opt-text">
            <strong>{armed === "reset" ? "Tap again to empty the inbox" : "Only empty the inbox"}</strong>
            <small>Deletes every call and leaves the inbox empty. No demo calls are loaded.</small>
          </span>
        </button>
      </div>

      {note}

      {rows.length > 0 && (
        <ol className="admin-run" aria-label="Demo calls">
          {rows.map(r => (
            <li key={r.id} className={`admin-call admin-call--${r.state}`}>
              <span className={`admin-tile${r.level ? ` admin-tile--${r.level}` : ""}`} aria-hidden="true">
                {r.state === "done" && r.score != null ? r.score : r.state === "failed" ? "!" : r.state === "sending" ? <i className="admin-spin" /> : ""}
              </span>
              <span className="admin-call-main">
                <span className="admin-call-title">{r.title}</span>
                <span className="admin-call-state">
                  {r.state === "waiting" ? "Waiting" : r.state === "sending" ? "AI is analyzing…"
                    : r.state === "failed" ? r.detail
                    : `${r.detail}${r.level ? `, ${RISK_LABEL_EN[r.level].toLowerCase()}` : ""}`}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="admin-foot">Logs out by itself after 15 minutes without use. <a href="/">Open the demo</a></p>
    </main>
  );
}
