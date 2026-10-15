// OWNER: Sky. Tete wrote this stub so the server compiles. Do not edit after the first commit.
import type { CallAnalysis, TranscriptTurn } from "../contract";
import { riskLevelFromScore } from "../contract";

export interface AnalyzeInput {
  transcript: TranscriptTurn[];
  callerKey: string;
  ownerLabel: string;
  agentDataCollection?: Record<string, unknown> | null;
}

export async function analyzeCall(input: AnalyzeInput): Promise<CallAnalysis> {
  const said = input.transcript.filter(t => t.role === "caller").map(t => t.text).join(" ");
  const score = 50;
  return {
    callerName: null, organization: null, targetPerson: null, knewOwner: null,
    reason: said.slice(0, 80) || "ไม่ทราบ", reasonEn: null,
    summary: said.slice(0, 200) || "ผู้โทรไม่ได้ให้ข้อมูล", summaryEn: null,
    callbackNumber: null, urgency: "normal",
    riskScore: score, riskLevel: riskLevelFromScore(score),
    redFlags: [], evidence: [], recommendedAction: "review",
    source: "rules", analyzedAt: new Date().toISOString(),
  };
}
