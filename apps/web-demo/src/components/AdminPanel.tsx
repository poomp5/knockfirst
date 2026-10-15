import { useEffect, useRef, useState } from "react";
import type { TranscriptTurn } from "../lib/contract";
import demoCases from "../lib/demoCases.json";
import { FAMILY_ID, SERVER_URL } from "../lib/env";
import { useCalls } from "../lib/useCalls";

// Team-only page at #admin: reset the demo family and load the 5 stage-demo calls before going on stage.
// Uses the server's existing admin endpoints (/demo/reset, /dev/simulate-call) with DEMO_ADMIN_TOKEN from the server env.
// The token is never part of the public bundle: it's typed in once (or opened as #admin/<token>, which is removed from
// the address bar right away) and remembered in this browser's localStorage after the server accepts it.
const TOKEN_KEY = "kf-admin-token";
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

async function post(path: string, token: string, body: unknown) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (res.status === 401) throw new Error("Wrong admin token");
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

  const ready = health.kind === "ok" && token.length >= 16 && !busy;

  async function reset() {
    const r = await post("/demo/reset", token, { familyId: FAMILY_ID });
    const d = r.deleted ?? {};
    return `Inbox cleared: ${d.calls ?? 0} calls, ${d.blocked ?? 0} blocked numbers, ${d.whitelist ?? 0} added known callers, ${d.globalReports ?? 0} blocklist reports. Seed callers kept.`;
  }

  async function load() {
    setRows(CASES.map(c => ({ id: c.id, title: c.title, state: "waiting" })));
    let failed = 0;
    for (const c of CASES) {
      setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "sending" } : r)));
      try {
        const j = await post("/dev/simulate-call", token, { familyId: FAMILY_ID, from: c.from, transcript: c.transcript });
        const score = j.analysis?.riskScore ?? "–";
        const status = String(j.status).replace("_", " ");
        setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "done", detail: `${status}, risk ${score}` } : r)));
      } catch (e) {
        failed++;
        const detail = e instanceof Error ? e.message : String(e);
        setRows(rs => rs.map(r => (r.id === c.id ? { ...r, state: "failed", detail } : r)));
        if (detail === "Wrong admin token") { setRows([]); throw e; }
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
      saveToken(token); // only a token the server accepted is kept
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

      <label className="field admin-token">
        <span>Admin token (DEMO_ADMIN_TOKEN, ask Tete)</span>
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
