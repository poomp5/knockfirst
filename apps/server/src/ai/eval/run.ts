// OWNER: Sky. Offline eval: `npm run eval` (from apps/server, reads .env).
//   --rules        rules only (no LLM), writes results-rules.md
//   --case <id>    run one case, don't write a results file
import "dotenv/config";
import { writeFileSync } from "fs";
import { join } from "path";
import { analyzeCall } from "..";
import type { CallAnalysis } from "../../contract";
import { llmModel } from "../llm";
import { CASES, EvalCase } from "./cases";

const args = process.argv.slice(2);
const rulesOnly = args.includes("--rules");
const only = args.includes("--case") ? args[args.indexOf("--case") + 1] : null;
if (rulesOnly) delete process.env.LLM_API_KEY; // llm.ts then throws and analyzeCall returns the rules result

interface Row { c: EvalCase; a: CallAnalysis; ms: number; pass: boolean; why: string[] }

function check(c: EvalCase, a: CallAnalysis): string[] {
  const why: string[] = [];
  const e = c.expect;
  if (e.minScore != null && a.riskScore < e.minScore) why.push(`score<${e.minScore}`);
  if (e.maxScore != null && a.riskScore > e.maxScore) why.push(`score>${e.maxScore}`);
  for (const f of e.mustFlags ?? []) if (!a.redFlags.includes(f)) why.push(`missing ${f}`);
  if (e.action && a.recommendedAction !== e.action) why.push(`action=${a.recommendedAction}`);
  return why;
}

const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "n/a");

async function main() {
  const cases = only ? CASES.filter(c => c.id === only) : CASES;
  if (!cases.length) throw new Error(`no case "${only}"`);
  const rows: Row[] = [];
  for (const c of cases) {
    const t0 = Date.now();
    const a = await analyzeCall({ transcript: c.transcript, callerKey: c.from, ownerLabel: "เจ้าของเบอร์นี้" });
    const ms = Date.now() - t0;
    const why = check(c, a);
    rows.push({ c, a, ms, pass: why.length === 0, why });
  }

  const scams = rows.filter(r => r.c.label === "scam");
  const legit = rows.filter(r => r.c.label === "legit");
  const autoBlocked = rows.filter(r => r.a.riskScore >= 85);
  const detected = scams.filter(r => r.a.riskScore >= 70).length;
  const falseAlarms = legit.filter(r => r.a.riskScore >= 70).length;
  const precision = pct(autoBlocked.filter(r => r.c.label === "scam").length, autoBlocked.length);
  const avgMs = Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length);
  const fellBack = rulesOnly ? 0 : rows.filter(r => r.a.source === "rules").length;
  const engine = rulesOnly ? "rules only" : `${process.env.LLM_PROVIDER || "anthropic"} / ${llmModel()} + rules`;

  // Console table
  console.log("");
  console.log(`${"id".padEnd(16)}${"label".padEnd(7)}${"score".padStart(5)}  ${"action".padEnd(7)}${"src".padEnd(10)}${"ms".padStart(6)}  result  flags`);
  for (const r of rows) {
    console.log(
      `${r.c.id.padEnd(16)}${r.c.label.padEnd(7)}${String(r.a.riskScore).padStart(5)}  ${r.a.recommendedAction.padEnd(7)}${r.a.source.padEnd(10)}${String(r.ms).padStart(6)}  ${(r.pass ? "PASS" : "FAIL").padEnd(6)}  ${r.a.redFlags.join(",") || "-"}${r.pass ? "" : `  [${r.why.join("; ")}]`}`,
    );
  }
  const summary = [
    `Engine: ${engine}`,
    `Scam detection (scam scored ≥70): ${pct(detected, scams.length)}`,
    `False alarms (legit scored ≥70): ${pct(falseAlarms, legit.length)}`,
    `Auto-block precision (of score ≥85, share that are scams): ${precision}`,
    `Cases passing all expectations: ${pct(rows.filter(r => r.pass).length, rows.length)}`,
    `Average latency: ${avgMs} ms`,
  ];
  console.log("\n" + summary.join("\n"));
  if (fellBack) console.warn(`\n⚠ ${fellBack} case(s) fell back to rules (LLM failed). These are NOT LLM numbers.`);
  if (only) return;

  const md = [
    `# KnockFirst analyzer eval${rulesOnly ? " (rules only)" : ""}`,
    "",
    `Run ${new Date().toISOString()} · ${rows.length} labeled transcripts (${scams.length} scam, ${legit.length} legit) from \`cases.ts\`.`,
    `Regenerate: \`cd apps/server && npm run eval${rulesOnly ? " -- --rules" : ""}\`.`,
    "",
    "## Headline",
    "",
    ...summary.map(s => `- ${s}`),
    ...(fellBack ? ["", `> ⚠ ${fellBack} case(s) fell back to rules because the LLM call failed.`] : []),
    "",
    "## Cases",
    "",
    "| id | label | title | score | action | source | ms | result | flags |",
    "|---|---|---|---:|---|---|---:|---|---|",
    ...rows.map(r =>
      `| ${r.c.id} | ${r.c.label} | ${r.c.title.replace(/\|/g, "/")} | ${r.a.riskScore} | ${r.a.recommendedAction} | ${r.a.source} | ${r.ms} | ${r.pass ? "✅" : `❌ ${r.why.join("; ")}`} | ${r.a.redFlags.join(", ") || "-"} |`),
    "",
  ].join("\n");
  const out = join(__dirname, rulesOnly ? "results-rules.md" : "results.md");
  writeFileSync(out, md);
  console.log(`\nWrote ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
