// OWNER: Sky. Posts eval cases to the live server's /dev/simulate-call to create real, analyzed demo cards.
//   npm run simulate -- --demo            curated 5 (run right after /demo/reset)
//   npm run simulate -- --all
//   npm run simulate -- --case police-01  (repeat --case or use commas for several)
//   options: --family <id>  --delay <ms between calls, default 1500>
// Env (apps/server/.env): SERVER_URL or PUBLIC_BASE_URL, DEMO_ADMIN_TOKEN.
import "dotenv/config";
import { CASES, DEMO_IDS, EvalCase } from "./cases";

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

function pick(): EvalCase[] {
  if (args.includes("--all")) return CASES;
  if (args.includes("--demo")) return DEMO_IDS.map(id => CASES.find(c => c.id === id)!).filter(Boolean);
  const ids = args.flatMap((a, i) => (a === "--case" && args[i + 1] ? args[i + 1].split(",") : []));
  const missing = ids.filter(id => !CASES.some(c => c.id === id));
  if (missing.length) throw new Error(`unknown case(s): ${missing.join(", ")}. Known: ${CASES.map(c => c.id).join(", ")}`);
  return ids.map(id => CASES.find(c => c.id === id)!);
}

async function main() {
  const base = (process.env.SERVER_URL ?? process.env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  const token = process.env.DEMO_ADMIN_TOKEN;
  if (!base) throw new Error("Set SERVER_URL (or PUBLIC_BASE_URL) in apps/server/.env");
  if (!token) throw new Error("Set DEMO_ADMIN_TOKEN in apps/server/.env");
  const cases = pick();
  if (!cases.length) throw new Error("Nothing to send. Use --demo, --all, or --case <id>.");
  const familyId = opt("--family");
  const delay = Number(opt("--delay") ?? 1500);

  console.log(`→ ${base}/dev/simulate-call · ${cases.length} call(s)${familyId ? ` · family ${familyId}` : ""}`);
  let failed = 0;
  for (const [i, c] of cases.entries()) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/dev/simulate-call`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ ...(familyId ? { familyId } : {}), from: c.from, transcript: c.transcript }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 401 ? " (wrong DEMO_ADMIN_TOKEN)" : ""}: ${text.slice(0, 200)}`);
      const j = JSON.parse(text);
      const a = j.analysis;
      console.log(
        `${c.id.padEnd(16)} ${String(j.status).padEnd(13)} score=${String(a?.riskScore ?? "-").padStart(3)} src=${a?.source ?? "-"} ${Date.now() - t0}ms  ${j.callId}`,
      );
    } catch (e) {
      failed++;
      console.error(`${c.id.padEnd(16)} FAILED ${e instanceof Error ? e.message : e}`);
    }
    if (i < cases.length - 1 && delay > 0) await new Promise(r => setTimeout(r, delay));
  }
  if (failed) process.exit(1);
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
