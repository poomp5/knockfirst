// OWNER: Sky. B6 live security checks against the deployed server. Non-destructive by default:
// every probe either should be rejected, or is a no-op event the pipeline ignores.
//   npx tsx src/ai/eval/security.ts                 (uses SERVER_URL / PUBLIC_BASE_URL from .env)
//   npx tsx src/ai/eval/security.ts --twilio        also POSTs an unsigned /twilio/voice (creates a call + push if
//                                                   signature validation is OFF, so only run it before a reset)
import "dotenv/config";
import crypto from "crypto";

const base = (process.env.SERVER_URL ?? process.env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
const withTwilio = process.argv.includes("--twilio");
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

  // Voice token rate limit (10/min/IP). With `trust proxy: true`, a spoofed X-Forwarded-For may bypass it.
  const tok = await req("/voice/token?identity=security-probe");
  if (tok.status === 503) record("voice token rate limit", "SKIP", "twilio not configured");
  else {
    let limited = false;
    for (let i = 0; i < 12 && !limited; i++) limited = (await req("/voice/token?identity=security-probe")).status === 429;
    let spoofOk = 0;
    for (let i = 0; i < 3; i++) {
      const r = await req("/voice/token?identity=security-probe", { headers: { "x-forwarded-for": `203.0.113.${10 + i}` } });
      if (r.status === 200) spoofOk++;
    }
    record("voice token rate limit", limited ? "PASS" : "FAIL", limited ? "429 after burst" : "no 429 after 13 requests");
    if (limited) record("rate limit vs spoofed X-Forwarded-For", spoofOk ? "WARN" : "PASS",
      spoofOk ? `${spoofOk}/3 spoofed requests got tokens while limited (set app "trust proxy" to 1)` : "still limited");
  }

  if (withTwilio) {
    const tw = await req("/twilio/voice", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: "+66900009999", To: "+6620000000", CallSid: "CAsecurityprobe" + now }).toString(),
    });
    record("twilio webhook unsigned", tw.status === 403 || tw.status === 401 ? "PASS" : "WARN",
      tw.status === 200 ? "200: VALIDATE_TWILIO_SIGNATURE is off, forged calls are accepted" : String(tw.status));
  } else record("twilio webhook unsigned", "SKIP", "run with --twilio (creates a call if validation is off)");

  const w = Math.max(...rows.map(r => r.name.length));
  for (const r of rows) console.log(`${r.result.padEnd(5)} ${r.name.padEnd(w)}  ${r.detail}`);
  const fails = rows.filter(r => r.result === "FAIL").length;
  console.log(`\n${fails ? `${fails} FAIL` : "No failures"}, ${rows.filter(r => r.result === "WARN").length} WARN`);
  process.exit(fails ? 1 : 0);
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
