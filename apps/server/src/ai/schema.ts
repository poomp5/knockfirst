// OWNER: Sky. Lenient parsing of the LLM's JSON → a strict CallAnalysis.
import { z } from "zod";
import { CallAnalysis, RedFlag, riskLevelFromScore, toCallerKey } from "../contract";
import type { AnalyzeInput } from "./index";

export const RED_FLAGS: readonly RedFlag[] = [
  "authority_claim", "accusation_threat", "money_request", "personal_info_request", "secrecy_isolation",
  "channel_switch", "urgency_pressure", "story_pivot", "unknown_target", "refused_identity",
];
export const isRedFlag = (x: unknown): x is RedFlag => typeof x === "string" && (RED_FLAGS as readonly string[]).includes(x);

const optStr = z.string().nullish().catch(null);

export const LlmAnalysisSchema = z.object({
  callerName: optStr,
  organization: optStr,
  targetPerson: optStr,
  knewOwner: z.boolean().nullish().catch(null),
  reason: z.string().catch(""),
  reasonEn: optStr,
  summary: z.string().catch(""),
  summaryEn: optStr,
  callbackNumber: z.union([z.string(), z.number()]).nullish().catch(null),
  urgency: z.enum(["normal", "urgent"]).catch("normal"),
  // No catch: without a usable score the output is worthless, so throw and let the rules answer.
  riskScore: z.coerce.number().refine(Number.isFinite, "riskScore not a number"),
  redFlags: z.array(z.unknown()).catch([]),
  evidence: z.array(z.unknown()).catch([]),
  recommendedAction: z.enum(["accept", "review", "block"]).optional().catch(undefined),
});

export const normWs = (s: string) => s.replace(/\s+/g, " ").trim();
const clean = (s: string | null | undefined, max = 200): string | null => {
  const t = normWs(s ?? "");
  return t ? t.slice(0, max) : null;
};

export function normalizeCallback(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw);
  const digits = s.replace(/\D/g, "");
  return digits.length >= 9 ? toCallerKey(s) : null;
}

export function actionFromScore(score: number, identified: boolean): CallAnalysis["recommendedAction"] {
  return score >= 70 ? "block" : score < 30 && identified ? "accept" : "review";
}

/** Throws if the shape is unusable (index.ts falls back to rules). */
export function normalize(raw: unknown, input: AnalyzeInput): CallAnalysis {
  const p = LlmAnalysisSchema.parse(raw);
  const score = Math.round(Math.min(100, Math.max(0, p.riskScore)));

  // Anti-hallucination: keep a quote only if it really occurs in a caller turn.
  const callerText = input.transcript.filter(t => t.role === "caller").map(t => normWs(t.text).toLowerCase());
  const seen = new Set<string>();
  const evidence: CallAnalysis["evidence"] = [];
  for (const e of p.evidence) {
    if (!e || typeof e !== "object") continue;
    const { flag, quote } = e as { flag?: unknown; quote?: unknown };
    if (!isRedFlag(flag) || typeof quote !== "string") continue;
    const q = normWs(quote).replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").replace(/^(\.\.\.|…)|(\.\.\.|…)$/g, "").trim();
    if (q.length < 2 || !callerText.some(c => c.includes(q.toLowerCase()))) continue;
    const key = `${flag}|${q}`;
    if (seen.has(key)) continue;
    seen.add(key);
    evidence.push({ flag, quote: q.slice(0, 120) });
  }

  const redFlags = Array.from(new Set([...p.redFlags.filter(isRedFlag), ...evidence.map(e => e.flag)]));
  const callerName = clean(p.callerName, 80);
  const organization = clean(p.organization, 80);

  return {
    callerName,
    organization,
    targetPerson: clean(p.targetPerson, 80),
    knewOwner: p.knewOwner ?? null,
    reason: clean(p.reason, 120) ?? "",
    reasonEn: clean(p.reasonEn, 160),
    summary: clean(p.summary, 400) ?? "",
    summaryEn: clean(p.summaryEn, 500),
    callbackNumber: normalizeCallback(p.callbackNumber),
    urgency: score >= 70 ? "normal" : p.urgency,
    riskScore: score,
    riskLevel: riskLevelFromScore(score),
    redFlags,
    evidence,
    recommendedAction: p.recommendedAction ?? actionFromScore(score, !!(callerName || organization)),
    source: "llm",
    analyzedAt: new Date().toISOString(),
  };
}
