// OWNER: Sky. analyzeCall(): LLM → validate → merge with rule floors → fallback to rules. Never throws.
import { CallAnalysis, riskLevelFromScore, TranscriptTurn } from "../contract";
import { callLLM, extractJson, llmModel } from "./llm";
import { ANALYSIS_SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { detectFlags, ruleBasedAnalysis, scoreFloor } from "./rules";
import { normalize } from "./schema";

export interface AnalyzeInput {
  transcript: TranscriptTurn[];
  callerKey: string;
  ownerLabel: string;
  agentDataCollection?: Record<string, unknown> | null;
}

export async function analyzeCall(input: AnalyzeInput): Promise<CallAnalysis> {
  const t0 = Date.now();
  let rules: CallAnalysis;
  try {
    rules = ruleBasedAnalysis(input);
  } catch (e) {
    // Should be impossible; keep the "never throws" promise even against a bad regex or odd input.
    console.error("[ai] rules crashed", e);
    rules = emptyAnalysis();
  }

  try {
    const text = await callLLM(ANALYSIS_SYSTEM_PROMPT, buildUserMessage(input));
    const llm = normalize(JSON.parse(extractJson(text)), input);
    const { injection } = detectFlags(input);

    // Safety floors: deterministic patterns can't be talked down by the LLM.
    const min = scoreFloor(rules.redFlags, injection);
    const adjusted = llm.riskScore < min;
    const score = Math.max(llm.riskScore, min);

    const redFlags = Array.from(new Set([...llm.redFlags, ...rules.redFlags]));
    // Add rule evidence for flags the LLM didn't quote, so every chip has a quote behind it.
    const quoted = new Set(llm.evidence.map(e => e.flag));
    const evidence = [...llm.evidence, ...rules.evidence.filter(e => !quoted.has(e.flag))];

    const result: CallAnalysis = {
      ...llm,
      reason: llm.reason || rules.reason,
      summary: llm.summary || rules.summary,
      callerName: llm.callerName ?? rules.callerName,
      organization: llm.organization ?? rules.organization,
      callbackNumber: llm.callbackNumber ?? rules.callbackNumber,
      riskScore: score,
      riskLevel: riskLevelFromScore(score),
      redFlags,
      evidence,
      urgency: score >= 70 ? "normal" : llm.urgency,
      recommendedAction: score >= 70 ? "block" : llm.recommendedAction,
      source: adjusted || redFlags.length > llm.redFlags.length ? "llm+rules" : "llm",
    };
    log(result, t0);
    return result;
  } catch (e) {
    console.warn("[ai] LLM failed, using rules:", e instanceof Error ? e.message : e);
    log(rules, t0);
    return rules;
  }
}

function log(a: CallAnalysis, t0: number) {
  console.log(`[ai] model=${a.source === "rules" ? "rules" : llmModel()} ms=${Date.now() - t0} score=${a.riskScore} flags=${a.redFlags.join(",") || "-"} source=${a.source}`);
}

function emptyAnalysis(): CallAnalysis {
  return {
    callerName: null, organization: null, targetPerson: null, knewOwner: null,
    reason: "ไม่สามารถวิเคราะห์สายได้", reasonEn: "Could not analyze the call.",
    summary: "ระบบวิเคราะห์ขัดข้อง กรุณาตรวจสอบบทสนทนาด้วยตนเอง", summaryEn: "Analysis failed; please read the transcript.",
    callbackNumber: null, urgency: "normal", riskScore: 50, riskLevel: riskLevelFromScore(50),
    redFlags: [], evidence: [], recommendedAction: "review", source: "rules", analyzedAt: new Date().toISOString(),
  };
}
