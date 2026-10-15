// OWNER: Sky. B6 live security checks against the deployed server. Non-destructive by default:
// every probe either should be rejected, or is a no-op event the pipeline ignores.
//   npx tsx src/ai/eval/security.ts                 (uses SERVER_URL / PUBLIC_BASE_URL from .env)
// Update 05: Twilio is gone; the web phone line is POST /call/start + /call/end. The probes below only send
// invalid bodies, so they never create calls or spend ElevenLabs credits.
import "dotenv/config";
import crypto from "crypto";

const base = (process.env.SERVER_URL ?? process.env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
type Result = "PASS" | "FAIL" | "WARN" | "SKIP";
const rows: { name: string; result: Result; detail: string }[] = [];
const record = (name: string, result: Result, detail: string) => rows.push({ name, result, detail });

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(base + path, { redirect: "manual", ...init });
  const text = await res.text().catch(() => "");
  return { status: res.status, headers: res.headers, text };
}
const json = (body: unknown, headers: Record<string, string> = {}): RequestInit =>
  ({ method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

async function main() {
  if (!base) throw new Error("Set SERVER_URL (or PUBLIC_BASE_URL) in apps/server/.env");
  console.log(`Security checks against ${base}\n`);

  const h = await req("/health");
  record("GET /health", h.status === 200 ? "PASS" : "FAIL", `${h.status} ${h.text.slice(0, 60)}`);

  // Admin endpoints must reject missing and wrong tokens.
  const probe = { from: "+66900009999", transcript: [{ role: "caller", text: "security probe", t: 1 }] };
  for (const [name, path, body] of [
    ["/dev/simulate-call", "/dev/simulate-call", probe],
    ["/demo/reset", "/demo/reset", { familyId: "security-probe-nonexistent" }],
  ] as const) {
    const none = await req(path, json(body));
    record(`${name} without token`, none.status === 401 ? "PASS" : "FAIL", String(none.status));
    const wrong = await req(path, json(body, { "x-admin-token": "wrong-token-" + crypto.randomBytes(8).toString("hex") }));
    record(`${name} wrong token`, wrong.status === 401 ? "PASS" : "FAIL", String(wrong.status));
  }

  // ElevenLabs webhook: unsigned / forged / stale signatures must be 401. The body is an event type the pipeline
  // ignores, so even a FAIL here doesn't create cards.
  const evt = JSON.stringify({ type: "security_probe", data: {} });
  const post = (sig?: string) => req("/webhooks/elevenlabs", {
    method: "POST", headers: { "content-type": "application/json", ...(sig ? { "elevenlabs-signature": sig } : {}) }, body: evt,
  });
  const now = Math.floor(Date.now() / 1000);
  const unsigned = await post();
  record("webhook unsigned", unsigned.status === 401 ? "PASS" : "FAIL",
    unsigned.status === 200 ? "200: ELEVENLABS_WEBHOOK_SECRET is not set, anyone can inject transcripts" : String(unsigned.status));
  const forged = await post(`t=${now},v0=${crypto.randomBytes(32).toString("hex")}`);
  record("webhook forged signature", forged.status === 401 ? "PASS" : "FAIL", String(forged.status));
  const stale = await post(`t=${now - 3 * 3600},v0=${"0".repeat(64)}`);
  record("webhook stale timestamp", stale.status === 401 ? "PASS" : "FAIL", String(stale.status));

  // CORS: an unknown origin must not be echoed back.
  const cors = await req("/health", { headers: { origin: "https://evil.example" } });
  const acao = cors.headers.get("access-control-allow-origin");
  record("CORS unknown origin", !acao || (acao !== "*" && acao !== "https://evil.example") ? "PASS" : "FAIL", `ACAO=${acao ?? "(none)"}`);

  // Web phone line (update 05). Invalid bodies are rejected before any call or ElevenLabs token is created.
  const bad = await req("/call/start", json({ callerNumber: "12" }));
  record("/call/start short number", bad.status === 400 ? "PASS" : "FAIL", String(bad.status));
  const endBad = await req("/call/end", json({ callId: "../families/x" }));
  record("/call/end invalid call id", endBad.status === 400 ? "PASS" : "FAIL", String(endBad.status));
  const endUnknown = await req("/call/end", json({ callId: "web_securityprobe" }));
  record("/call/end unknown call", endUnknown.status === 404 ? "PASS" : "FAIL", String(endUnknown.status));

  // Rate limit (10/min/IP) on /call/start. The limiter runs before validation, so invalid bodies count too.
  let limited = false;
  for (let i = 0; i < 12 && !limited; i++) limited = (await req("/call/start", json({ callerNumber: "12" }))).status === 429;
  record("/call/start rate limit", limited ? "PASS" : "FAIL", limited ? "429 after burst" : "no 429 after 12 requests");
  if (limited) {
    let spoofOk = 0;
    for (let i = 0; i < 3; i++) {
      const r = await req("/call/start", json({ callerNumber: "12" }, { "x-forwarded-for": `203.0.113.${10 + i}` }));
      if (r.status !== 429) spoofOk++;
    }
    record("rate limit vs spoofed X-Forwarded-For", spoofOk ? "WARN" : "PASS",
      spoofOk ? `${spoofOk}/3 spoofed requests got past the limit (server trusts any X-Forwarded-For)` : "still limited");
  }

  const w = Math.max(...rows.map(r => r.name.length));
  for (const r of rows) console.log(`${r.result.padEnd(5)} ${r.name.padEnd(w)}  ${r.detail}`);
  const fails = rows.filter(r => r.result === "FAIL").length;
  console.log(`\n${fails ? `${fails} FAIL` : "No failures"}, ${rows.filter(r => r.result === "WARN").length} WARN`);
  process.exit(fails ? 1 : 0);
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
